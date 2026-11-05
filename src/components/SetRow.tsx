import { REPS_STEP, WEIGHT_STEP } from '../constants'
import { removeSet, updateSetLog } from '../db'
import type { SetLog } from '../types'
import Stepper from './Stepper'

export default function SetRow({ log, number, color, canRemove }: {
  log: SetLog
  number: number
  color: string
  canRemove: boolean
}) {
  const id = log.id!
  return (
    <div
      data-testid="set-row"
      className={`flex items-stretch gap-3 rounded-2xl p-3 transition-colors ${log.done ? 'bg-zinc-800/60' : 'bg-zinc-900'}`}
    >
      <div className="flex w-8 flex-col items-center justify-center">
        <span className="text-xs text-zinc-500">第</span>
        <span className="text-2xl font-bold">{number}</span>
        <span className="text-xs text-zinc-500">組</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Stepper label="重量" unit="kg" step={WEIGHT_STEP} value={log.weight} onChange={(weight) => updateSetLog(id, { weight })} />
        <Stepper label="次數" unit="下" step={REPS_STEP} value={log.reps} onChange={(reps) => updateSetLog(id, { reps })} />
        {canRemove && (
          <button onClick={() => removeSet(id)} className="self-start text-xs text-zinc-500">
            刪除這組
          </button>
        )}
      </div>
      <button
        onClick={() => updateSetLog(id, { done: !log.done })}
        aria-label={log.done ? '取消完成' : '完成這組'}
        aria-pressed={log.done}
        className="w-16 shrink-0 rounded-xl border-2 text-3xl font-bold"
        style={log.done ? { background: color, borderColor: color, color: '#000' } : { borderColor: '#3f3f46', color: '#52525b' }}
      >
        ✓
      </button>
    </div>
  )
}
