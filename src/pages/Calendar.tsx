import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import { REST_COLOR, WEEKDAY_LABELS } from '../constants'
import { clearDay, db, setDayPlan } from '../db'
import { formatDateLabel, monthGrid, toDateKey, todayKey } from '../lib/date'
import { SessionType, type Menu, type Session } from '../types'

export default function Calendar() {
  const navigate = useNavigate()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)

  const days = monthGrid(cursor.y, cursor.m)
  const firstKey = toDateKey(days[0])
  const lastKey = toDateKey(days[days.length - 1])

  const menus = useLiveQuery(() => db.menus.orderBy('order').toArray(), [])
  const sessions = useLiveQuery(
    () => db.sessions.where('date').between(firstKey, lastKey, true, true).toArray(),
    [firstKey, lastKey],
  )
  const selectedSession = useLiveQuery(() => db.sessions.where('date').equals(selected).first(), [selected])
  const selectedLogCount = useLiveQuery(
    () => (selectedSession?.id ? db.setLogs.where('sessionId').equals(selectedSession.id).filter((l) => l.done).count() : 0),
    [selectedSession?.id],
  )

  const menuById = new Map(menus?.map((m) => [m.id!, m]))
  const sessionByDate = new Map(sessions?.map((s) => [s.date, s]))

  const colorOf = (s?: Session) =>
    s ? (s.type === SessionType.REST ? REST_COLOR : menuById.get(s.menuId!)?.color) : undefined
  const labelOf = (s?: Session) =>
    s ? (s.type === SessionType.REST ? '休息' : (menuById.get(s.menuId!)?.name ?? '已刪除菜單')) : undefined

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const choose = async (type: SessionType, menu?: Menu) => {
    const cur = selectedSession
    const changing = cur && (cur.type !== type || cur.menuId !== menu?.id)
    if (changing && selectedLogCount && !confirm(`這天已有 ${selectedLogCount} 組紀錄，改掉會刪除，確定？`)) return
    const id = await setDayPlan(selected, type, menu?.id)
    if (type === SessionType.MENU) navigate(`/session/${id}/0`)
  }

  const remove = async () => {
    if (selectedLogCount && !confirm(`這天的 ${selectedLogCount} 組紀錄會被刪除，確定？`)) return
    await clearDay(selected)
  }

  return (
    <Page title="健身紀錄">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="rounded-lg px-3 py-1 text-2xl text-zinc-400" aria-label="上個月">
          ‹
        </button>
        <div className="text-lg font-semibold">
          {cursor.y} 年 {cursor.m + 1} 月
        </div>
        <button onClick={() => shiftMonth(1)} className="rounded-lg px-3 py-1 text-2xl text-zinc-400" aria-label="下個月">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = toDateKey(d)
          const s = sessionByDate.get(key)
          const color = colorOf(s)
          const inMonth = d.getMonth() === cursor.m
          return (
            <button
              key={key}
              data-date={key}
              onClick={() => setSelected(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm
                ${inMonth ? '' : 'opacity-30'}
                ${key === selected ? 'ring-2 ring-white' : ''}
                ${key === today ? 'font-bold' : ''}`}
              style={{ background: color ? `${color}33` : '#18181b' }}
            >
              <span className={key === today ? 'text-orange-400' : ''}>{d.getDate()}</span>
              {s && (
                <span className="mt-0.5 truncate text-[10px] leading-none" style={{ color }}>
                  {labelOf(s)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <section className="mt-5 rounded-2xl bg-zinc-900 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {selected === today ? '今天' : formatDateLabel(selected)}
            {selectedSession && (
              <span className="ml-2 text-base" style={{ color: colorOf(selectedSession) }}>
                {labelOf(selectedSession)}
              </span>
            )}
          </h2>
          {selectedSession && (
            <button onClick={remove} className="text-sm text-zinc-500">
              清除
            </button>
          )}
        </div>

        {selectedSession?.type === SessionType.MENU && (
          <button
            onClick={() => navigate(`/session/${selectedSession.id}/0`)}
            className="mb-3 w-full rounded-xl py-3 text-lg font-semibold text-black"
            style={{ background: colorOf(selectedSession) }}
          >
            {selected === today ? '繼續訓練' : '查看紀錄'}
            {selectedLogCount ? `（已完成 ${selectedLogCount} 組）` : ''}
          </button>
        )}

        <p className="mb-2 text-sm text-zinc-400">{selectedSession ? '改成：' : '今天要做什麼？'}</p>
        <div className="grid grid-cols-3 gap-2">
          {menus?.map((m) => (
            <button
              key={m.id}
              onClick={() => choose(SessionType.MENU, m)}
              className="rounded-xl border-2 py-3 font-semibold"
              style={{ borderColor: m.color, color: m.color }}
            >
              {m.name}
            </button>
          ))}
          <button
            onClick={() => choose(SessionType.REST)}
            className="rounded-xl border-2 py-3 font-semibold"
            style={{ borderColor: REST_COLOR, color: '#a1a1aa' }}
          >
            休息
          </button>
        </div>
      </section>
    </Page>
  )
}
