import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Page from '../components/Page'
import Photo from '../components/Photo'
import { db, getLastPerformance, listExercises, setDayPlan } from '../db'
import { formatDateLabel, todayKey } from '../lib/date'
import { SessionType } from '../types'

export default function MenuDetail() {
  const menuId = Number(useParams().menuId)
  const navigate = useNavigate()
  const menu = useLiveQuery(() => db.menus.get(menuId), [menuId])
  const items = useLiveQuery(async () => {
    const exercises = await listExercises(menuId)
    return Promise.all(exercises.map(async (e) => ({ ...e, last: await getLastPerformance(e.id!) })))
  }, [menuId])

  const start = async () => {
    const today = await db.sessions.where('date').equals(todayKey()).first()
    if (today && !(today.type === SessionType.MENU && today.menuId === menuId)) {
      const done = await db.setLogs.where('sessionId').equals(today.id!).filter((l) => l.done).count()
      if (done && !confirm(`今天已有 ${done} 組其他紀錄，改成「${menu?.name}」會刪除，確定？`)) return
    }
    const id = await setDayPlan(todayKey(), SessionType.MENU, menuId)
    navigate(`/session/${id}/0`)
  }

  if (!menu) return null

  return (
    <Page
      title={menu.name}
      back
      action={
        <Link to={`/menu/${menuId}/edit`} className="text-orange-400">
          編輯
        </Link>
      }
    >
      {items?.length === 0 && (
        <div className="rounded-2xl bg-zinc-900 p-6 text-center text-zinc-400">
          還沒有器材，
          <Link to={`/menu/${menuId}/edit`} className="text-orange-400">
            按這裡新增
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {items?.map((e, i) => (
          <div key={e.id} className="flex gap-3 rounded-2xl bg-zinc-900 p-3">
            <Photo blob={e.photo} fallback={e.defaultPhoto} alt={e.name} className="h-24 w-24 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="truncate text-lg font-semibold">
                <span className="mr-1 text-zinc-500">{i + 1}.</span>
                {e.name}
              </div>
              <div className="text-zinc-400">
                {e.targetSets} 組 × {e.targetReps} 下
              </div>
              <div className="text-sm" style={{ color: menu.color }}>
                {e.last ? `上次 ${e.last.weight} kg × ${e.last.reps}（${formatDateLabel(e.last.date)}）` : '還沒有紀錄'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!!items?.length && (
        <button
          onClick={start}
          className="mt-5 w-full rounded-2xl py-4 text-lg font-bold text-black"
          style={{ background: menu.color }}
        >
          今天做這份
        </button>
      )}
    </Page>
  )
}
