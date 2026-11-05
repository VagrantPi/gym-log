import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LEGACY_OPEN_SETS_CLEANED_KEY } from './constants.ts'
import { cleanupLegacyOpenSets, seedIfEmpty } from './db.ts'
import './index.css'

// 要求持久化儲存，降低 iOS 自動清除 IndexedDB 的機率
void navigator.storage?.persist?.()

async function boot() {
  await seedIfEmpty()
  if (!localStorage.getItem(LEGACY_OPEN_SETS_CLEANED_KEY)) {
    await cleanupLegacyOpenSets()
    localStorage.setItem(LEGACY_OPEN_SETS_CLEANED_KEY, '1')
  }
}

boot().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
