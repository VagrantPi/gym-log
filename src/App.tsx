import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Calendar from './pages/Calendar'
import MenuDetail from './pages/MenuDetail'
import MenuEdit from './pages/MenuEdit'
import MenuList from './pages/MenuList'
import Settings from './pages/Settings'
import Workout from './pages/Workout'

const TABS = [
  { to: '/', label: '日曆', icon: '📅' },
  { to: '/menus', label: '菜單', icon: '📋' },
  { to: '/settings', label: '設定', icon: '⚙️' },
] as const

function TabBar() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/session')) return null
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-orange-400' : 'text-zinc-400'}`
          }
        >
          <span className="text-xl leading-none">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Calendar />} />
        <Route path="/menus" element={<MenuList />} />
        <Route path="/menu/:menuId" element={<MenuDetail />} />
        <Route path="/menu/:menuId/edit" element={<MenuEdit />} />
        <Route path="/session/:sessionId/:index" element={<Workout />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <TabBar />
    </HashRouter>
  )
}
