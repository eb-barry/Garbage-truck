# 🗑 垃圾車快到了

新北市垃圾車即時追蹤 PWA，讓長者在家就能掌握垃圾車抵達時間。

**線上使用：** https://eb-barry.github.io/Garbage-truck/

---

## 功能說明

- **GPS 自動定位**：自動判斷您所在的行政區
- **里別路線選擇**：依行政區 → 里別 → 路線三步驟設定
- **即時距離顯示**：以 80px 大字顯示垃圾車與您的距離
- **語音播報**：每 2 分鐘自動播報距離，200 公尺內提示「請準備」
- **螢幕常亮**：使用 Screen Wake Lock API 防止螢幕休眠
- **到達通知**：垃圾車進入 80 公尺時顯示全螢幕到達提示
- **根據時間自動選路線**：早上自動選白天班，傍晚後自動選晚上班
- **PWA 支援**：可安裝到手機主畫面，離線仍可開啟

---

## 系統架構

```
Garbage-truck/
├── index.html          ← 主程式（單頁應用，所有 CSS + JS 內嵌）
├── sw.js               ← Service Worker（離線快取）
├── manifest.json       ← PWA 設定
├── routes.csv          ← 新北市垃圾車路線資料（需定期更新）
├── icons/
│   ├── icon-192.png    ← PWA 圖示
│   └── icon-512.png    ← PWA 圖示（大）
└── .github/
    └── workflows/
        └── update-routes.yml  ← 每日自動更新 routes.csv
```

### 使用的外部資源

| 資源 | 用途 |
|------|------|
| [新北市垃圾清運車輛所在位置](https://data.ntpc.gov.tw/datasets/28ab4122-60e1-4065-98e5-abccb69aaca6) | 即時垃圾車 GPS（每 2 分鐘更新） |
| [Leaflet.js](https://leafletjs.com/) | 地圖顯示 |
| [OpenStreetMap](https://www.openstreetmap.org/) | 地圖底圖 |
| [Nominatim](https://nominatim.openstreetmap.org/) | 反向地理編碼（GPS→行政區） |

---

## 部署方式

### 首次部署

1. Fork 或 Clone 此 repo
2. 手動下載路線資料並放入 repo 根目錄：
   ```
   下載 URL：https://data.ntpc.gov.tw/api/datasets/edc3ad26-8ae7-4916-a00b-bc6048d19bf8/csv/file
   存成檔名：routes.csv
   ```
3. 在 GitHub repo 設定中啟用 **GitHub Pages**，來源選 `main` branch 根目錄
4. 啟用 GitHub Actions（見下方說明）

### 開啟 GitHub Pages

```
repo → Settings → Pages → Source: Deploy from a branch
Branch: main  /  Folder: / (root)
→ Save
```

---

## routes.csv 更新說明

### 為什麼需要 routes.csv？

新北市開放資料平台的 API 有 CORS 限制，JavaScript 無法直接從瀏覽器端下載。將 CSV 放入同一個 repo，讓 GitHub Pages 提供，完全繞開 CORS 問題。

### 手動更新

1. 開啟瀏覽器前往：
   ```
   https://data.ntpc.gov.tw/api/datasets/edc3ad26-8ae7-4916-a00b-bc6048d19bf8/csv/file
   ```
2. 下載後將檔案命名為 `routes.csv`
3. 放入 repo 根目錄，commit 並 push

### 資料來源

- **資料集名稱**：新北市垃圾車路線
- **提供機關**：新北市政府環境保護局
- **更新頻率**：每日（路線實際上不常變動）
- **資料筆數**：約 26,730 筆

---

## GitHub Actions 自動更新說明

`.github/workflows/update-routes.yml` 會在每天台灣時間早上 6:00 自動執行，從新北市官方 API 下載最新 routes.csv 並更新 repo。

### 啟用方式

1. 前往 repo → **Actions** 頁籤
2. 若出現「Workflows aren't being run」提示，點擊 **「I understand my workflows, go ahead and enable them」**
3. 點選左側 **「每日更新垃圾車路線資料」**
4. 點擊 **「Run workflow」** 手動測試一次

### 手動觸發

```
Actions → 每日更新垃圾車路線資料 → Run workflow → Run workflow
```

### 若自動更新失敗

Action 失敗時 GitHub 會寄 email 通知，此時請手動更新（見上方手動更新步驟）。

---

## 開發者注意事項

### 程式結構

`index.html` 是單一檔案應用，所有 CSS、HTML、JavaScript 都內嵌其中：

```javascript
// 主要物件
const State = { ... }   // 全域應用狀態
const App   = { ... }   // 所有方法集中管理

// 關鍵方法
App.init()                     // 啟動，判斷進設定或主畫面
App.locateByGPS()              // GPS 定位
App._downloadRouteJSON()       // 下載 routes.csv 並解析
App._populateVillageSelect()   // 填入里別下拉選單
App._renderRouteList()         // 渲染路線勾選清單
App.saveSettings()             // 儲存設定 → 切到主畫面
App.initTrackingScreen()       // 初始化主畫面
App._autoSelectRouteByTime()   // 根據時間自動選路線
App._fetchAndUpdate()          // 每 2 分鐘抓 GPS 資料
App._processGPS()              // 計算距離、更新 UI、觸發語音
App._acquireWakeLock()         // 防止螢幕休眠
```

### localStorage 格式

```json
{
  "distAlert": 500,
  "currentDistrict": "新店區",
  "currentVillage": "青潭里",
  "allCheckedRoutes": ["231006", "231045"],
  "sel": { "noon": "231006", "night": "231045" }
}
```

### 即時 GPS API

```
GET https://data.ntpc.gov.tw/api/datasets/28ab4122-60e1-4065-98e5-abccb69aaca6/json?size=200
```

回傳欄位：`lineid`, `car`, `time`, `location`, `longitude`, `latitude`, `cityid`, `cityname`

每 2 分鐘更新一次，只包含目前出勤中的車輛。

### CORS 說明

| API | 直連 | 說明 |
|-----|------|------|
| 即時 GPS API | ⚠️ 需 proxy | 有 CORS 限制，程式自動嘗試多個 proxy |
| routes.csv（本 repo）| ✅ 直連 | 同源，無 CORS 問題 |
| Nominatim | ✅ 直連 | 允許跨域 |
| OpenStreetMap tiles | ✅ 直連 | 允許跨域 |

---

## 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.0 | 2026-04 | 初始版本，完整設定流程 + 主畫面 |

---

## 授權

本程式採 MIT 授權。路線資料來源為新北市政府開放資料，授權方式請參考[政府資料開放授權條款](https://data.gov.tw/license)。
