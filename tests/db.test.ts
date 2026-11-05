import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSet,
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

async function finishAll(sessionId: number, exerciseId: number, weights: number[]) {
  const rows = await listSetLogs(sessionId, exerciseId)
  for (const [i, r] of rows.entries()) await updateSetLog(r.id!, { weight: weights[i], done: true })
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
    expect(await db.setLogs.count()).toBe(3)

    expect(await setDayPlan('2026-11-05', SessionType.MENU, upper.id)).toBe(sid)
    expect(await db.setLogs.count()).toBe(3)

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
    await ensureSetLogs(s1, ex)
    await finishAll(s1, ex.id!, [30, 35, 35])

    const s2 = await setDayPlan('2026-11-03', SessionType.MENU, upper.id)
    await ensureSetLogs(s2, ex)
    // 預填自 11/01
    expect((await listSetLogs(s2, ex.id!)).map((r) => r.weight)).toEqual([30, 35, 35])
    await finishAll(s2, ex.id!, [40, 42.5, 40])

    const last = await getLastPerformance(ex.id!)
    expect(last).toMatchObject({ date: '2026-11-03', weight: 42.5 })

    // 排除 11/03 那場時回到 11/01
    expect((await getLastPerformance(ex.id!, s2))?.date).toBe('2026-11-01')

    // 未打勾的不算
    const s3 = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    await ensureSetLogs(s3, ex)
    expect((await getLastPerformance(ex.id!))?.date).toBe('2026-11-03')
  })

  it('ensureSetLogs 重複呼叫不會重複建立；addSet 沿用上一組數值', async () => {
    const [upper] = await db.menus.orderBy('order').toArray()
    const ex = await makeExercise(upper.id!, 0, '划船')
    const sid = await setDayPlan('2026-11-05', SessionType.MENU, upper.id)
    await ensureSetLogs(sid, ex)
    await ensureSetLogs(sid, ex)
    const rows = await listSetLogs(sid, ex.id!)
    expect(rows).toHaveLength(3)
    expect(rows[0].reps).toBe(10)

    await updateSetLog(rows[2].id!, { weight: 50 })
    await addSet(sid, ex.id!)
    const after = await listSetLogs(sid, ex.id!)
    expect(after).toHaveLength(4)
    expect(after[3]).toMatchObject({ setIndex: 3, weight: 50, reps: 10, done: false })
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
