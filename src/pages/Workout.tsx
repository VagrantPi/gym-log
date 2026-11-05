import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Photo from '../components/Photo'
import SetRow from '../components/SetRow'
import { addSet, db, ensureSetLogs, getLastPerformance, listExercises, listSetLogs } from '../db'
import { formatDateLabel } from '../lib/date'
import { SessionType } from '../types'

export default function Workout() {
  const params = useParams()
  const sessionId = Number(params.sessionId)
  const index = Number(params.index)
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)

  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId)
    if (!session || session.type !== SessionType.MENU) return { session, menu: undefined, exercises: [] }
    const menu = await db.menus.get(session.menuId!)
    return { session, menu, exercises: await listExercises(session.menuId!) }
  }, [sessionId])

  const exercise = data?.exercises[index]
  const exerciseId = exercise?.id

  const logs = useLiveQuery(
    () => (exerciseId ? listSetLogs(sessionId, exerciseId) : []),
    [sessionId, exerciseId],
  )
  const last = useLiveQuery(
    () => (exerciseId ? getLastPerformance(exerciseId, sessionId) : null),
    [sessionId, exerciseId],
  )

  useEffect(() => {
    // ensureSetLogs 已有資料就不動，重跑無害
    if (exercise) void ensureSetLogs(sessionId, exercise)
  }, [sessionId, exercise])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [index])

  if (!data) return null
  if (!data.menu || data.exercises.length === 0)
    return (
      <div className="pt-safe flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-zinc-400">
        這份菜單還沒有器材
        <Link to="/" className="text-orange-400">
          回日曆
        </Link>
      </div>
    )
  if (!exercise) return <Navigate to={`/session/${sessionId}/0`} replace />

  const { menu, exercises, session } = data
  const total = exercises.length
  const isLast = index === total - 1
  const doneCount = logs?.filter((l) => l.done).length ?? 0
  const go = (i: number) => navigate(`/session/${sessionId}/${i}`, { replace: true })

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <div ref={scroller} className="flex-1 overflow-y-auto">
        {/* 第一屏：器材照片滿版 */}
        <section className="relative h-full">
          <Photo blob={exercise.photo} fallback={exercise.defaultPhoto} alt={exercise.name} className="absolute inset-0 h-full w-full" />
          <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8">
            <Link to="/" className="py-3 text-lg text-white/90" aria-label="離開">
              ✕
            </Link>
            <span className="rounded-full px-3 py-1 text-sm font-semibold text-black" style={{ background: menu.color }}>
              {menu.name} · {formatDateLabel(session!.date)}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-4 pt-16">
            <div className="text-sm text-zinc-400">
              器材 {index + 1} / {total}
            </div>
            <h1 className="text-3xl font-bold" data-testid="exercise-name">
              {exercise.name || `器材 ${index + 1}`}
            </h1>
            <div className="mt-1 text-lg text-zinc-300">
              目標 {exercise.targetSets} 組 × {exercise.targetReps} 下
            </div>
            <div className="text-lg font-semibold" style={{ color: menu.color }} data-testid="last-performance">
              {last ? `上次 ${last.weight} kg × ${last.reps}（${formatDateLabel(last.date)}）` : '第一次做這個器材'}
            </div>
            {exercise.note && <div className="mt-1 text-sm text-zinc-400">📝 {exercise.note}</div>}
            <button
              onClick={() => scroller.current?.scrollTo({ top: scroller.current.clientHeight * 0.85, behavior: 'smooth' })}
              className="mt-3 w-full animate-pulse text-center text-sm text-zinc-400"
            >
              往下滑記錄 ⌄ {doneCount ? `（已完成 ${doneCount} 組）` : ''}
            </button>
          </div>
        </section>

        {/* 往下滑：組數紀錄 */}
        <section className="space-y-3 p-4">
          {last && (
            <div className="text-sm text-zinc-500">
              上次：{last.sets.map((s) => `${s.weight}×${s.reps}`).join('、')}
            </div>
          )}
          {logs?.map((log, i) => (
            <SetRow key={log.id} log={log} number={i + 1} color={menu.color} canRemove={logs.length > 1} />
          ))}
          {logs?.length !== 0 && logs?.every((l) => l.done) && (
            <button
              onClick={() => addSet(sessionId, exercise.id!)}
              className="w-full rounded-2xl border-2 border-dashed border-zinc-700 py-3 text-zinc-300"
            >
              ＋ 加一組
            </button>
          )}
        </section>
      </div>

      <nav className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex-1 rounded-xl bg-zinc-800 py-3 text-lg font-semibold disabled:opacity-30"
        >
          ‹ 上一個
        </button>
        <span className="w-14 text-center text-sm tabular-nums text-zinc-400">
          {index + 1} / {total}
        </span>
        {isLast ? (
          <button
            onClick={() => navigate('/')}
            className="flex-1 rounded-xl py-3 text-lg font-bold text-black"
            style={{ background: menu.color }}
          >
            完成訓練
          </button>
        ) : (
          <button onClick={() => go(index + 1)} className="flex-1 rounded-xl bg-zinc-800 py-3 text-lg font-semibold">
            下一個 ›
          </button>
        )}
      </nav>
    </div>
  )
}
