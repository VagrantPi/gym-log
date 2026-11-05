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

  // 已完成：縮成一行，點一下重新展開修改
  if (log.done)
    return (
      <button
        data-testid="set-row"
        data-done="true"
        onClick={() => updateSetLog(id, { done: false })}
        aria-label={`修改第 ${number} 組`}
        className="flex w-full items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-left"
      >
        <span className="w-14 text-sm text-zinc-500">第 {number} 組</span>
        <span className="flex-1 text-xl font-bold tabular-nums">
          {log.weight} <span className="text-sm font-normal text-zinc-400">kg</span> × {log.reps}{' '}
          <span className="text-sm font-normal text-zinc-400">下</span>
        </span>
        <span className="text-2xl font-bold" style={{ color }}>
          ✓
        </span>
      </button>
    )

  return (
    <div data-testid="set-row" data-done="false" className="flex items-stretch gap-3 rounded-2xl bg-zinc-900 p-3">
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
        onClick={() => updateSetLog(id, { done: true })}
        aria-label="完成這組"
        className="w-16 shrink-0 rounded-xl border-2 text-3xl font-bold"
        style={{ borderColor: color, color }}
      >
        ✓
      </button>
    </div>
  )
}
