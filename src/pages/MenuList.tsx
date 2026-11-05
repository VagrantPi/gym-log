import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import Page from '../components/Page'
import { db } from '../db'

export default function MenuList() {
  const menus = useLiveQuery(async () => {
    const list = await db.menus.orderBy('order').toArray()
    return Promise.all(list.map(async (m) => ({ ...m, count: await db.exercises.where('menuId').equals(m.id!).count() })))
  }, [])

  return (
    <Page title="菜單">
      <div className="space-y-3">
        {menus?.map((m) => (
          <Link
            key={m.id}
            to={`/menu/${m.id}`}
            className="flex items-center gap-4 rounded-2xl bg-zinc-900 p-5"
            style={{ borderLeft: `6px solid ${m.color}` }}
          >
            <span className="flex-1 text-xl font-semibold">{m.name}</span>
            <span className="text-zinc-400">{m.count ? `${m.count} 個器材` : '尚未設定'}</span>
            <span className="text-zinc-600">›</span>
          </Link>
        ))}
      </div>
    </Page>
  )
}
