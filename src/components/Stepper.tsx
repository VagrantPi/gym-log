import { useRef, useState } from 'react'

export default function Stepper({ value, step, unit, label, onChange }: {
  value: number
  step: number
  unit: string
  label: string
  onChange: (n: number) => void
}) {
  // 輸入中的草稿；沒在輸入時直接顯示 value
  const [draft, setDraft] = useState<string | null>(null)
  // 最後一次送出的數字；這列只有這個 Stepper 會改它，所以比等資料庫回傳的 value 更即時
  const latest = useRef(value)
  const emit = (n: number) => {
    latest.current = n
    onChange(n)
  }

  const parse = (raw: string) => {
    const n = Number(raw.replace(',', '.'))
    return raw.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null
  }
  // ± 以剛打的數字為準：點按鈕時輸入框先 blur 清掉草稿，資料庫也可能還沒回來
  const bump = (delta: number) => {
    const base = (draft !== null ? parse(draft) : null) ?? latest.current
    setDraft(null)
    emit(Math.max(0, +(base + delta).toFixed(2)))
  }

  const commit = (raw: string) => {
    setDraft(null)
    const n = parse(raw)
    if (n !== null && n !== latest.current) emit(n)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => bump(-step)}
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
          onChange={(e) => {
            setDraft(e.target.value)
            // 打字當下就存，app 被關掉或更新重載也不會丟
            const n = parse(e.target.value)
            if (n !== null && n !== latest.current) emit(n)
          }}
          onBlur={(e) => commit(e.target.value)}
          className="w-16 bg-transparent text-center text-2xl font-bold tabular-nums outline-none"
        />
        <span className="text-sm text-zinc-400">{unit}</span>
      </label>
      <button
        onClick={() => bump(step)}
        className="h-11 w-11 shrink-0 rounded-xl bg-zinc-800 text-2xl active:bg-zinc-700"
        aria-label={`${label}增加`}
      >
        +
      </button>
    </div>
  )
}
