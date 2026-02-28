# Pro Camera Simulator — Advanced

[![Deploy Camera Simulator](https://github.com/lianyongli/camera-simulator-1/actions/workflows/deploy.yml/badge.svg)](https://github.com/lianyongli/camera-simulator-1/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML](https://img.shields.io/badge/Built%20with-HTML%205-E34C26?logo=html5)](https://html.spec.whatwg.org/)

一個功能強大的相機模擬器，提供專業級別的攝影參數控制和即時預覽效果。

## ✨ 主要特性

### 📸 完整的相機模擬
- **光學控制**：光圈（0.9 ~ 50F）、快門（1/160000 ~ 30s）、ISO（50 ~ 102400）
- **感光元件**：全幅、APS-C、M4/3、中畫幅模擬
- **色彩科學**：尼康、佳能、富士、萊卡品牌色彩模擬
- **白平衡**：2500K ~ 10000K色溫調整

### 🎨 高級視覺效果
- **光學效果**：暗角、散景、色散、焦點輔助線
- **鏡頭劣化**：入塵、刮痕、霧化、水滴效果
- **特殊效果**：漏光（多位置多選）、動態模糊、顯示面板模擬

### 📊 精細編輯工具
- **曲線編輯**：固定15個控制點的專業曲線調整
- **快門預設**：27個專業快門速度預設按鈕
- **像素模擬**：1MP ~ 45MP 感光元件範圍
- **神經消噪**：AI 風格的消噪效果

### 🚀 現代化設計
- **玻璃態 UI**：毛玻璃效果 + 動畫過渡
- **響應式設計**：完美支援桌面、平板、手機
- **流暢動畫**：滑入、淡入、發光等視覺效果
- **繁體中文**：原生繁體中文界面

### 📱 RWD 支援
- **縮放友善**：智能響應式預覽區域
- **觸控優化**：移動設備滑動控制面板支援
- **跨設備**：桌面、平板、手機完全適配

### 🌍 國際化準備
- **i18n 架構**：預留國際化翻譯結構
- **多語言支援**：繁體中文、英文等

## 🎯 快速開始

### 在線使用
1. 直接打開 `index.html` 或訪問 GitHub Pages
2. 在左側預覽照片效果
3. 右側調整各項參數
4. 匯出 PNG 或 JSON 設定

### 功能分類

**拍攝設定標籤：**
- 光圈、快門、ISO、白平衡等基礎參數
- 感光元件選擇、曝光補償、閃光燈

**後置設定標籤：**
- 濾鏡、曲線編輯、漏光、水印
- 雜訊控制、顯示面板模擬、神經消噪

## 📋 技術棧

| 技術 | 版本 | 說明 |
|-----|-----|------|
| React | 18 (CDN) | 無構建工具的 CDN 版本 |
| Babel | Standalone | 前端 JSX 編譯 |
| CSS3 | - | 動畫、漸變、毛玻璃效果 |
| Canvas | HTML5 | 圖像處理、PNG 導出 |

## 🏗️ 文件結構

```
camera-simulator-1/
├── index.html                      # 主應用程序（完整單檔）
├── README.md                       # 本文件
├── docs/
│   ├── README.md                   # 詳細文檔
│   ├── FEATURES.md                 # 功能文檔
│   └── CHANGELOG.md                # 更新日誌
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD
└── .gitignore
```

## 🔧 特色功能詳解

### 漏光位置多選
- 新增 9 個預設位置（上左、上中、上右、中左、中心、中右、下左、下中、下右）
- 支援多位置同時激活漏光效果
- 導出時完整保留多位置設定

### 光圈預設編輯器
- 27 個專業快門速度預設（1/160000 ~ 30s）
- 一鍵切換常用快門組合
- 支援自定義快門值微調

### 曲線編輯工具
- 固定 15 個等距控制點（0.00 ~ 1.00）
- 拖曳調整曲線形狀
- 一鍵重置曲線

### 浮水印控制
- 文字、位置、透明度、字型大小（10-48px）
- 導出 PNG 時保留水印大小設定

### 神經風格消噪
- 模擬 AI 消噪效果
- 可調整消噪強度

## 📤 導出功能

### PNG 導出
- 套用所有相機效果和後製設定
- 保留漏光、水印、曲線等設定
- 支援多個導出解析度選擇

### JSON 導出
- 完整的相機設定序列化
- 支援導入已保存的設定

## 🎮 交互功能

- **拖入圖像**：拖曳圖片到預覽區更換
- **點擊聚焦**：點擊預覽區進行觸控對焦模擬
- **滾輪縮放**：鼠標滾輪調整數位變焦
- **滑動控制**：移動設備支援垂直滑動控制面板

## 🌐 瀏覽器支援

| 瀏覽器 | 支援度 |
|-------|-------|
| Chrome/Edge | ✅ 完全支援 |
| Firefox | ✅ 完全支援 |
| Safari | ✅ 完全支援 |
| Opera | ✅ 完全支援 |

## 🚀 部署

### GitHub Pages 自動部署
此項目已配置 GitHub Actions 工作流，推送到 `main` 分支後自動部署到 GitHub Pages。

### 本地測試
```bash
# macOS/Linux
python3 -m http.server 8000

# Windows
python -m http.server 8000
```
然後訪問 `http://localhost:8000`

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📞 聯繫方式

如有問題或建議，請提交 GitHub Issue。

---

**最後更新**：2026 年 1 月 31 日
