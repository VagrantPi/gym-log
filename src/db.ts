import Dexie, { type EntityTable } from 'dexie'
import { SEED } from './configs/seed'
import { DB_NAME } from './constants'
import { SessionType, type Exercise, type LastPerformance, type Menu, type SeedMenu, type Session, type SetLog } from './types'

export const db = new Dexie(DB_NAME) as Dexie & {
  menus: EntityTable<Menu, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  sessions: EntityTable<Session, 'id'>
  setLogs: EntityTable<SetLog, 'id'>
}

db.version(1).stores({
  menus: '++id, order',
  exercises: '++id, menuId, [menuId+order]',
  sessions: '++id, &date',
  setLogs: '++id, sessionId, exerciseId, [sessionId+exerciseId]',
})

export async function seedIfEmpty(seed: SeedMenu[] = SEED): Promise<void> {
  await db.transaction('rw', db.menus, db.exercises, async () => {
    if ((await db.menus.count()) > 0) return
    for (const [order, { exercises, ...menu }] of seed.entries()) {
      const menuId = (await db.menus.add({ ...menu, order })) as number
      await db.exercises.bulkAdd(exercises.map((e, i) => ({ ...e, menuId, order: i })))
    }
  })
}

export function listExercises(menuId: number): Promise<Exercise[]> {
  return db.exercises.where('[menuId+order]').between([menuId, Dexie.minKey], [menuId, Dexie.maxKey]).toArray()
}

/**
 * 設定某天的安排。同一天已有紀錄且換成別的菜單／休息時，舊的組數紀錄一併清掉。
 */
export async function setDayPlan(date: string, type: SessionType, menuId?: number): Promise<number> {
  return db.transaction('rw', db.sessions, db.setLogs, async () => {
    const existing = await db.sessions.where('date').equals(date).first()
    const nextMenuId = type === SessionType.MENU ? menuId : undefined
    if (existing?.id !== undefined) {
      if (existing.type === type && existing.menuId === nextMenuId) return existing.id
      await db.setLogs.where('sessionId').equals(existing.id).delete()
      await db.sessions.update(existing.id, { type, menuId: nextMenuId })
      return existing.id
    }
    return db.sessions.add({ date, type, menuId: nextMenuId, createdAt: Date.now() }) as Promise<number>
  })
}

export async function clearDay(date: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    const s = await db.sessions.where('date').equals(date).first()
    if (s?.id === undefined) return
    await db.setLogs.where('sessionId').equals(s.id).delete()
    await db.sessions.delete(s.id)
  })
}

/** 該器材最近一次（排除指定場次）有打勾完成的紀錄 */
export async function getLastPerformance(exerciseId: number, excludeSessionId?: number): Promise<LastPerformance | null> {
  const logs = (await db.setLogs.where('exerciseId').equals(exerciseId).toArray()).filter(
    (l) => l.done && l.sessionId !== excludeSessionId,
  )
  if (logs.length === 0) return null
  const sessionIds = [...new Set(logs.map((l) => l.sessionId))]
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s)
  if (sessions.length === 0) return null
  const latest = sessions.reduce((a, b) => (b.date > a.date ? b : a))
  const sets = logs
    .filter((l) => l.sessionId === latest.id)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((l) => ({ weight: l.weight, reps: l.reps }))
  const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a))
  return { date: latest.date, weight: top.weight, reps: top.reps, sets }
}

export function listSetLogs(sessionId: number, exerciseId: number): Promise<SetLog[]> {
  return db.setLogs
    .where('[sessionId+exerciseId]')
    .equals([sessionId, exerciseId])
    .toArray()
    .then((rows) => rows.sort((a, b) => a.setIndex - b.setIndex))
}

/** 第一次進到某器材時建立目標組數的空白列，數值預填上次的紀錄 */
export async function ensureSetLogs(sessionId: number, exercise: Exercise): Promise<void> {
  const exerciseId = exercise.id!
  const last = await getLastPerformance(exerciseId, sessionId)
  await db.transaction('rw', db.setLogs, async () => {
    const count = await db.setLogs.where('[sessionId+exerciseId]').equals([sessionId, exerciseId]).count()
    if (count > 0) return
    const now = Date.now()
    const rows: SetLog[] = Array.from({ length: exercise.targetSets }, (_, i) => {
      const prev = last?.sets[Math.min(i, last.sets.length - 1)]
      return {
        sessionId,
        exerciseId,
        setIndex: i,
        weight: prev?.weight ?? 0,
        reps: prev?.reps ?? exercise.targetReps,
        done: false,
        updatedAt: now,
      }
    })
    await db.setLogs.bulkAdd(rows)
  })
}

export async function updateSetLog(id: number, patch: Partial<Pick<SetLog, 'weight' | 'reps' | 'done'>>): Promise<void> {
  await db.setLogs.update(id, { ...patch, updatedAt: Date.now() })
}

export async function addSet(sessionId: number, exerciseId: number): Promise<void> {
  const rows = await listSetLogs(sessionId, exerciseId)
  const prev = rows.at(-1)
  await db.setLogs.add({
    sessionId,
    exerciseId,
    setIndex: (prev?.setIndex ?? -1) + 1,
    weight: prev?.weight ?? 0,
    reps: prev?.reps ?? 0,
    done: false,
    updatedAt: Date.now(),
  })
}

export async function removeSet(id: number): Promise<void> {
  await db.setLogs.delete(id)
}

export async function saveExercise(ex: Exercise): Promise<number> {
  return db.exercises.put(ex) as Promise<number>
}

export async function deleteExercise(id: number): Promise<void> {
  await db.transaction('rw', db.exercises, db.setLogs, async () => {
    await db.setLogs.where('exerciseId').equals(id).delete()
    await db.exercises.delete(id)
  })
}

/** 交換兩個器材的排序 */
export async function swapExerciseOrder(a: Exercise, b: Exercise): Promise<void> {
  await db.transaction('rw', db.exercises, async () => {
    await db.exercises.update(a.id!, { order: b.order })
    await db.exercises.update(b.id!, { order: a.order })
  })
}
