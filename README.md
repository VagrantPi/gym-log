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
