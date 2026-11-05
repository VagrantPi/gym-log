export const SessionType = {
  MENU: 'MENU',
  REST: 'REST',
} as const
export type SessionType = (typeof SessionType)[keyof typeof SessionType]

export interface Menu {
  id?: number
  name: string
  order: number
  color: string
}

export interface Exercise {
  id?: number
  menuId: number
  order: number
  name: string
  /** 使用者上傳的照片，優先顯示 */
  photo?: Blob
  /** 打包在網站裡的預設圖，public/ 底下的相對路徑 */
  defaultPhoto?: string
  targetSets: number
  targetReps: number
  note?: string
}

export interface Session {
  id?: number
  /** 本地日期 YYYY-MM-DD，一天一筆 */
  date: string
  type: SessionType
  menuId?: number
  createdAt: number
}

export interface SetLog {
  id?: number
  sessionId: number
  exerciseId: number
  setIndex: number
  weight: number
  reps: number
  done: boolean
  updatedAt: number
}

export interface LastPerformance {
  date: string
  weight: number
  reps: number
  sets: { weight: number; reps: number }[]
}

export interface SeedMenu {
  name: string
  color: string
  exercises: Pick<Exercise, 'name' | 'targetSets' | 'targetReps' | 'note' | 'defaultPhoto'>[]
}
