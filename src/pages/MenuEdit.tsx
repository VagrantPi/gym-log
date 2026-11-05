import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Page from '../components/Page'
import Photo from '../components/Photo'
import { DEFAULT_TARGET_REPS, DEFAULT_TARGET_SETS } from '../constants'
import { db, deleteExercise, listExercises, saveExercise, swapExerciseOrder } from '../db'
import { compressPhoto } from '../lib/image'
import type { Exercise } from '../types'

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  return (
    <label className="flex flex-1 flex-col text-xs text-zinc-400">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={value}
        onBlur={(e) => {
          const n = Math.max(1, Math.round(Number(e.target.value) || 1))
          e.target.value = String(n)
          if (n !== value) onCommit(n)
        }}
        className="mt-1 rounded-lg bg-zinc-800 px-3 py-2 text-base text-white"
      />
    </label>
  )
}

function ExerciseEditor({ ex, index, prev, next }: { ex: Exercise; index: number; prev?: Exercise; next?: Exercise }) {
  const [busy, setBusy] = useState(false)
  const save = (patch: Partial<Exercise>) => db.exercises.update(ex.id!, patch)

  const onPhoto = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      await save({ photo: await compressPhoto(file) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-zinc-900 p-3" data-testid="exercise-editor">
      <div className="flex gap-3">
        <label className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl">
          <Photo blob={ex.photo} fallback={ex.defaultPhoto} alt={ex.name} className="h-full w-full" />
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-xs">
            {busy ? '處理中…' : ex.photo || ex.defaultPhoto ? '換照片' : '加照片'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            placeholder={`器材 ${index + 1} 名稱`}
            defaultValue={ex.name}
            onBlur={(e) => e.target.value.trim() !== ex.name && save({ name: e.target.value.trim() })}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-base font-semibold text-white"
          />
          <div className="flex gap-2">
            <NumberField label="組數" value={ex.targetSets} onCommit={(n) => save({ targetSets: n })} />
            <NumberField label="次數" value={ex.targetReps} onCommit={(n) => save({ targetReps: n })} />
          </div>
        </div>
      </div>
      <input
        placeholder="備註（座椅高度、握法…）"
        defaultValue={ex.note}
        onBlur={(e) => e.target.value !== (ex.note ?? '') && save({ note: e.target.value })}
        className="mt-2 w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
      />
      <div className="mt-2 flex justify-end gap-4 text-sm text-zinc-400">
        {ex.photo && ex.defaultPhoto && (
          <button onClick={() => save({ photo: undefined })} className="mr-auto">
            還原預設圖
          </button>
        )}
        <button disabled={!prev} onClick={() => prev && swapExerciseOrder(ex, prev)} className="disabled:opacity-30">
          ↑ 上移
        </button>
        <button disabled={!next} onClick={() => next && swapExerciseOrder(ex, next)} className="disabled:opacity-30">
          ↓ 下移
        </button>
        <button
          onClick={() => confirm(`刪除「${ex.name || '這個器材'}」與它的所有紀錄？`) && deleteExercise(ex.id!)}
          className="text-red-400"
        >
          刪除
        </button>
      </div>
    </div>
  )
}

export default function MenuEdit() {
  const menuId = Number(useParams().menuId)
  const menu = useLiveQuery(() => db.menus.get(menuId), [menuId])
  const exercises = useLiveQuery(() => listExercises(menuId), [menuId])

  const add = () =>
    saveExercise({
      menuId,
      order: (exercises?.at(-1)?.order ?? -1) + 1,
      name: '',
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
    })

  if (!menu) return null

  return (
    <Page title={`編輯${menu.name}`} back>
      <div className="space-y-3">
        {exercises?.map((ex, i) => (
          <ExerciseEditor key={ex.id} ex={ex} index={i} prev={exercises[i - 1]} next={exercises[i + 1]} />
        ))}
      </div>
      <button
        onClick={add}
        className="mt-4 w-full rounded-2xl border-2 border-dashed border-zinc-700 py-4 text-zinc-300"
      >
        ＋ 新增器材
      </button>
    </Page>
  )
}
