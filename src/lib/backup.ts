import { z } from 'zod'
import { BACKUP_VERSION } from '../constants'
import { db } from '../db'
import { SessionType } from '../types'
import { blobToDataUrl, dataUrlToBlob } from './image'

const backupSchema = z.object({
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.number(),
  menus: z.array(z.object({ id: z.number(), name: z.string(), order: z.number(), color: z.string() })),
  exercises: z.array(
    z.object({
      id: z.number(),
      menuId: z.number(),
      order: z.number(),
      name: z.string(),
      photo: z.string().optional(),
      defaultPhoto: z.string().optional(),
      targetSets: z.number(),
      targetReps: z.number(),
      note: z.string().optional(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.number(),
      date: z.string(),
      type: z.enum([SessionType.MENU, SessionType.REST]),
      menuId: z.number().optional(),
      createdAt: z.number(),
    }),
  ),
  setLogs: z.array(
    z.object({
      id: z.number(),
      sessionId: z.number(),
      exerciseId: z.number(),
      setIndex: z.number(),
      weight: z.number(),
      reps: z.number(),
      done: z.boolean(),
      updatedAt: z.number(),
    }),
  ),
})

export async function exportBackup(): Promise<Blob> {
  const exercises = await db.exercises.toArray()
  const data = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    menus: await db.menus.toArray(),
    exercises: await Promise.all(
      exercises.map(async (e) => ({ ...e, photo: e.photo ? await blobToDataUrl(e.photo) : undefined })),
    ),
    sessions: await db.sessions.toArray(),
    setLogs: await db.setLogs.toArray(),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** 匯入會整個覆蓋現有資料 */
export async function importBackup(text: string): Promise<void> {
  const data = backupSchema.parse(JSON.parse(text))
  const exercises = await Promise.all(
    data.exercises.map(async (e) => ({ ...e, photo: e.photo ? await dataUrlToBlob(e.photo) : undefined })),
  )
  await db.transaction('rw', [db.menus, db.exercises, db.sessions, db.setLogs], async () => {
    await Promise.all([db.menus.clear(), db.exercises.clear(), db.sessions.clear(), db.setLogs.clear()])
    await db.menus.bulkAdd(data.menus)
    await db.exercises.bulkAdd(exercises)
    await db.sessions.bulkAdd(data.sessions)
    await db.setLogs.bulkAdd(data.setLogs)
  })
}
