import { useEffect, useState } from 'react'
import Page from '../components/Page'
import { db, seedIfEmpty } from '../db'
import { exportBackup, importBackup } from '../lib/backup'
import { todayKey } from '../lib/date'

export default function Settings() {
  const [persisted, setPersisted] = useState<boolean>()
  const [msg, setMsg] = useState('')

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const doExport = async () => {
    const blob = await exportBackup()
    const name = `gym-log-${todayKey()}.json`
    const file = new File([blob], name, { type: 'application/json' })
    // iOS 上用分享面板存到「檔案」最順；不支援時退回下載
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch {
        // 使用者取消分享
        return
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file?: File) => {
    if (!file) return
    if (!confirm('匯入會覆蓋目前所有資料，確定？')) return
    try {
      await importBackup(await file.text())
      setMsg('匯入完成')
    } catch (e) {
      setMsg(`匯入失敗：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const doReset = async () => {
    if (!confirm('刪除所有菜單、照片與紀錄？此動作無法復原')) return
    await db.delete()
    await db.open()
    await seedIfEmpty()
    setMsg('已清除')
  }

  return (
    <Page title="設定">
      <div className="space-y-3">
        <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
          資料只存在這支手機的瀏覽器裡。
          {persisted === false && ' 系統尚未允許永久保存，請定期匯出備份。'}
          {persisted && ' 已啟用永久保存。'}
        </div>
        <button onClick={doExport} className="w-full rounded-2xl bg-zinc-900 p-4 text-left text-lg">
          匯出備份
        </button>
        <label className="block w-full cursor-pointer rounded-2xl bg-zinc-900 p-4 text-lg">
          匯入備份
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
        </label>
        <button onClick={doReset} className="w-full rounded-2xl bg-zinc-900 p-4 text-left text-lg text-red-400">
          清除所有資料
        </button>
        {msg && <p className="text-center text-zinc-400">{msg}</p>}
      </div>
    </Page>
  )
}
