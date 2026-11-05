# 健身紀錄（gym-log）

手機用的健身紀錄 PWA：上肢／下肢菜單、日曆標記每天的菜單或休息、滿版逐器材記錄每組重量與次數。資料只存在手機瀏覽器的 IndexedDB，可在「設定」匯出／匯入 JSON 備份。

## 開發

```bash
npm install
npm run dev          # 本機開發
npm run dev -- --host  # 手機在同一個 Wi-Fi 下用電腦 IP 開（只能看畫面，PWA 安裝需 HTTPS）
npm test             # 資料層單元測試
npm run build
npx vite preview --port 4173 & npm run e2e   # iPhone 模擬完整流程
```

## 使用

1. 「菜單」→ 上肢／下肢 →「編輯」：新增器材、拍照、設定組數與次數
2. 「日曆」選今天要做的菜單 → 進入訓練頁，一頁一個器材，往下滑記錄每組，底部切換上一個／下一個
3. 部署到 HTTPS 網址後，用 iPhone Safari「加入主畫面」即可全螢幕、離線使用

## 預設器材與圖片

第一次打開 app 時，會依 `src/configs/seed.ts` 建立菜單與器材。預設圖放在 `public/exercises/`，`defaultPhoto` 填相對路徑：

```ts
{ name: '上肢', color: '#f97316', exercises: [
  { name: '胸推機', targetSets: 4, targetReps: 10, defaultPhoto: 'exercises/upper-1.jpg' },
] },
```

在手機上傳的照片只存在該手機，會覆蓋預設圖顯示；編輯頁可「還原預設圖」。
注意：seed 只在資料庫是空的時候套用，已經在用的手機要到「設定 → 清除所有資料」才會重新套用（先匯出備份）。

## 部署

push 到 `main` 會由 GitHub Actions 自動 build 並部署到 GitHub Pages（repo Settings → Pages → Source 選 GitHub Actions）。

## 更新與離線

- Service Worker 用 `autoUpdate`、但不 import `virtual:pwa-register`：新版會在背景接手，**不會強制重新整理頁面**，訓練到一半不會被打斷，下次打開 app 才是新版。
- 整個 app 是單一 JS bundle，舊頁面在新 SW 接手後不會去抓已被清掉的 chunk。
- 改資料結構時避免升 IndexedDB 版本；需要整理舊資料就像 `cleanupLegacyOpenSets` 一樣，在啟動時跑一次並用 localStorage 記號防止重跑。
- 數字輸入是打字當下就寫入 IndexedDB，app 被關掉或重新載入也不會丟。
