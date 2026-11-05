import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { seedIfEmpty } from './db.ts'
import './index.css'

// 要求持久化儲存，降低 iOS 自動清除 IndexedDB 的機率
void navigator.storage?.persist?.()

seedIfEmpty().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
