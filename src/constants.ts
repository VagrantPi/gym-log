export const DB_NAME = 'gym-log'

export const REST_COLOR = '#6b7280'

export const DEFAULT_TARGET_SETS = 4
export const DEFAULT_TARGET_REPS = 10

export const WEIGHT_STEP = 1
export const REPS_STEP = 1

export const PHOTO_MAX_EDGE = 1280
export const PHOTO_QUALITY = 0.8

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

export const BACKUP_VERSION = 1

/** 舊版一次預建多組空白列，升級後清一次；記號存在 localStorage */
export const LEGACY_OPEN_SETS_CLEANED_KEY = 'gym-log:legacy-open-sets-cleaned'
