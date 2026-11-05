import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Page({ title, back, action, children }: {
  title: string
  back?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="pt-safe min-h-full pb-24">
      <header className="flex items-center gap-2 px-4 py-3">
        {back && (
          <button onClick={() => navigate(-1)} className="-ml-2 px-2 text-2xl text-zinc-400" aria-label="返回">
            ‹
          </button>
        )}
        <h1 className="flex-1 text-2xl font-bold">{title}</h1>
        {action}
      </header>
      <main className="px-4">{children}</main>
    </div>
  )
}
