import type { SeedMenu } from '../types'

/**
 * 第一次打開 app 時建立的菜單與器材。
 * defaultPhoto 是 public/ 底下的相對路徑（例如 'exercises/upper-1.jpg'），
 * 會跟著網站一起部署；使用者在手機上傳的照片會覆蓋顯示。
 */
export const SEED: SeedMenu[] = [
  { name: '上肢', color: '#f97316', exercises: [] },
  { name: '下肢', color: '#3b82f6', exercises: [] },
]
