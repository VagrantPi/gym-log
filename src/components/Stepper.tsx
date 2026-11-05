import { useState } from 'react'

export default function Stepper({ value, step, unit, label, onChange }: {
  value: number
  step: number
  unit: string
  label: string
  onChange: (n: number) => void
}) {
  // 輸入中的草稿；沒在輸入時直接顯示 value
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (raw: string) => {
    setDraft(null)
    const n = Number(raw.replace(',', '.'))
    if (raw.trim() !== '' && Number.isFinite(n) && n >= 0 && n !== value) onChange(n)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
        className="h-11 w-11 shrink-0 rounded-xl bg-zinc-800 text-2xl active:bg-zinc-700"
        aria-label={`${label}減少`}
      >
        −
      </button>
      <label className="flex flex-1 items-baseline justify-center gap-1">
        <input
          aria-label={label}
          inputMode="decimal"
          value={draft ?? String(value)}
          onFocus={(e) => {
            setDraft(e.target.value)
            e.target.select()
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          className="w-16 bg-transparent text-center text-2xl font-bold tabular-nums outline-none"
        />
        <span className="text-sm text-zinc-400">{unit}</span>
      </label>
      <button
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="h-11 w-11 shrink-0 rounded-xl bg-zinc-800 text-2xl active:bg-zinc-700"
        aria-label={`${label}增加`}
      >
        +
      </button>
    </div>
  )
}
