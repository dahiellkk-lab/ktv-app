# 🎤 KTV 點歌系統 — Electron 桌面版

## 功能特色
- 🎵 歌曲資料庫（含華語/台語/日語/英語分類）
- 🎤 即時歌詞顯示與自動捲動
- 📋 點歌佇列管理（新增、移除、清除）
- 🔀 隨機播放 / 🔁 單曲循環
- 📁 匯入本地 MP3/FLAC/WAV 音樂檔案
- 🔊 音量控制
- 🖥️ 自訂標題列（最小化/最大化/關閉）
- 🎨 深色 KTV 風格介面

## 安裝方式

### 方法一：直接執行（開發模式）

```bash
# 安裝 Node.js（https://nodejs.org）後執行：
npm install
npm start
```

### 方法二：打包成 .exe（Windows）

```bash
npm install
npm run build-win
# 輸出在 dist/ 資料夾，找到 .exe 執行即可
```

### 方法三：打包成 .dmg（Mac）

```bash
npm install
npm run build-mac
```

## 使用說明

1. 從左側歌曲列表點擊「＋ 點唱」加入佇列
2. 右側佇列顯示排隊順序，標示「唱」的為當前播放
3. 可使用搜尋框搜尋歌名或歌手
4. 點擊「匯入本地音樂」可加入自己的 MP3 檔案
5. 進度條可點擊跳轉位置

## 系統需求

- Windows 10+ 或 macOS 10.13+
- Node.js 18+（僅開發模式需要）

## 版本

v1.0.0
