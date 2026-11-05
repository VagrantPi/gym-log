import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSet,
  cleanupLegacyOpenSets,
  clearDay,
  db,
  ensureSetLogs,
  getLastPerformance,
  listExercises,
  listSetLogs,
  seedIfEmpty,
  setDayPlan,
  updateSetLog,
} from '../src/db'
import { SessionType, type Exercise } from '../src/types'

async function makeExercise(menuId: number, order: number, name: string): Promise<Exercise> {
  const id = (await db.exercises.add({ menuId, order, name, targetSets: 3, targetReps: 10 })) as number
  return (await db.exercises.get(id))!
}

/** 模擬新流程：第 1 組自動建立，之後每組都是「打勾 → 加一組」 */
async function doSets(sessionId: number, ex: Exercise, weights: number[]) {
  await ensureSetLogs(sessionId, ex)
  for (const [i, w] of weights.entries()) {
    if (i > 0) await addSet(sessionId, ex.id!)
    const row = (await listSetLogs(sessionId, ex.id!)).at(-1)!
    await updateSetLog(row.id!, { weight: w, done: true })
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedIfEmpty()
})

describe('seed', () => {
  it('依設定檔建立菜單與器材（含預設圖路徑）', async () => {
    await db.delete()
    await db.open()
    await seedIfEmpty([
      { name: 'A', color: '#000', exercises: [{ name: '胸推', targetSets: 3, targetReps: 12, defaultPhoto: 'exercises/a.jpg' }] },
      { name: 'B', color: '#fff', exercises: [] },
    ])
    const [a, b] = await db.menus.orderBy('order').toArray()
    expect([a.name, b.name]).toEqual(['A', 'B'])
    expect(await listExercises(a.id!)).toMatchObject([{ name: '胸推', order: 0, defaultPhoto: 'exercises/a.jpg' }])
  })

  it('首次啟動建立上肢與下肢，重複呼叫不會多建', async () => {
    await seedIfEmpty()
    const menus = await db.menus.orderBy('order').toArray()
    expect(menus.map((m) => m.name)).toEqual(['上肢', '下肢'])
  })
})

describe('setDayPlan', () => {
  it('同一天只會有一筆，換菜單會清掉舊組數', async () => {
    const [upper, lower] = await db.menus.orderBy('order').toArray()
    const ex = await makeExercise(upper.id!, 0, '胸推')
    const sid = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    await ensureSetLogs(sid, ex)
    expect(await db.setLogs.count()).toBe(1)

    expect(await setDayPlan('2026-11-05', SessionType.MENU, upper.id)).toBe(sid)
    expect(await db.setLogs.count()).toBe(1)

    expect(await setDayPlan('2026-11-05', SessionType.MENU, lower.id)).toBe(sid)
    expect(await db.sessions.count()).toBe(1)
    expect(await db.setLogs.count()).toBe(0)

    await setDayPlan('2026-11-05', SessionType.REST)
    const s = await db.sessions.get(sid)
    expect(s?.type).toBe(SessionType.REST)
    expect(s?.menuId).toBeUndefined()
  })

  it('clearDay 刪掉當天紀錄', async () => {
    await setDayPlan('2026-11-05', SessionType.REST)
    await clearDay('2026-11-05')
    expect(await db.sessions.count()).toBe(0)
  })
})

describe('getLastPerformance / ensureSetLogs', () => {
  it('取最近日期且已完成的那一場，排除當場，並預填下一場', async () => {
    const [upper] = await db.menus.orderBy('order').toArray()
    const ex = await makeExercise(upper.id!, 0, '胸推')

    expect(await getLastPerformance(ex.id!)).toBeNull()

    const s1 = await setDayPlan('2026-11-01', SessionType.MENU, upper.id)
    await doSets(s1, ex, [30, 35, 35])

    const s2 = await setDayPlan('2026-11-03', SessionType.MENU, upper.id)
    await ensureSetLogs(s2, ex)
    // 只建第 1 組，帶入 11/01 的第 1 組
    expect((await listSetLogs(s2, ex.id!)).map((r) => [r.weight, r.done])).toEqual([[30, false]])
    await db.setLogs.where('sessionId').equals(s2).delete()
    await doSets(s2, ex, [40, 42.5, 40])

    const last = await getLastPerformance(ex.id!)
    expect(last).toMatchObject({ date: '2026-11-03', weight: 42.5 })

    // 排除 11/03 那場時回到 11/01
    expect((await getLastPerformance(ex.id!, s2))?.date).toBe('2026-11-01')

    // 未打勾的不算
    const s3 = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    await ensureSetLogs(s3, ex)
    expect((await getLastPerformance(ex.id!))?.date).toBe('2026-11-03')
  })

  it('ensureSetLogs 只建 1 組且重複呼叫不重建；addSet 帶入最後一組的重量與次數', async () => {
    const [upper] = await db.menus.orderBy('order').toArray()
    const ex = await makeExercise(upper.id!, 0, '划船')
    const sid = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    await ensureSetLogs(sid, ex)
    await ensureSetLogs(sid, ex)
    const rows = await listSetLogs(sid, ex.id!)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ setIndex: 0, weight: 0, reps: 10, done: false })

    await updateSetLog(rows[0].id!, { weight: 50, reps: 8, done: true })
    await addSet(sid, ex.id!)
    const after = await listSetLogs(sid, ex.id!)
    expect(after).toHaveLength(2)
    expect(after[1]).toMatchObject({ setIndex: 1, weight: 50, reps: 8, done: false })
  })
})

describe('cleanupLegacyOpenSets', () => {
  it('舊版預建的未打勾列每個場次＋器材只留最前面一列，已打勾不動，重跑無影響', async () => {
    const [upper] = await db.menus.orderBy('order').toArray()
    const a = await makeExercise(upper.id!, 0, 'A')
    const b = await makeExercise(upper.id!, 1, 'B')
    const sid = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    const row = (exerciseId: number, setIndex: number, weight: number, done: boolean) => ({
      sessionId: sid, exerciseId, setIndex, weight, reps: 10, done, updatedAt: 0,
    })
    // 舊版：A 勾了前 2 組、第 3 組打了數字沒勾；B 一組都沒勾
    await db.setLogs.bulkAdd([
      row(a.id!, 0, 40, true), row(a.id!, 1, 42, true), row(a.id!, 2, 45, false), row(a.id!, 3, 0, false),
      row(b.id!, 0, 20, false), row(b.id!, 1, 0, false), row(b.id!, 2, 0, false), row(b.id!, 3, 0, false),
    ])
    await cleanupLegacyOpenSets()
    await cleanupLegacyOpenSets()
    const pick = async (id: number) => (await listSetLogs(sid, id)).map((r) => [r.setIndex, r.weight, r.done])
    expect(await pick(a.id!)).toEqual([[0, 40, true], [1, 42, true], [2, 45, false]])
    expect(await pick(b.id!)).toEqual([[0, 20, false]])
  })
})

describe('listExercises', () => {
  it('依 order 排序且只取該菜單', async () => {
    const [upper, lower] = await db.menus.orderBy('order').toArray()
    await makeExercise(upper.id!, 1, 'B')
    await makeExercise(upper.id!, 0, 'A')
    await makeExercise(lower.id!, 0, '深蹲')
    expect((await listExercises(upper.id!)).map((e) => e.name)).toEqual(['A', 'B'])
  })
})
