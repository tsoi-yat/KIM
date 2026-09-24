# UNIQLO Price Tracker (UNIQLO 降價追蹤與自動化監控)

[![UNIQLO Price Tracker](https://github.com/tsoi-yat/KIM/actions/workflows/uniqlo-tracker.yml/badge.svg)](https://github.com/tsoi-yat/KIM/actions/workflows/uniqlo-tracker.yml)

這是一個基於 **GitHub Actions** 與 **Node.js** 的雲端自動化價格監控專案。每 2 小時自動連線 UNIQLO 台灣官方 API 獲取商品即時價格，當商品售價低於基準價格時，立即透過 Gmail SMTP 發送 HTML 格式的降價通知信。

---

## 📌 監控目標與設定

* **監控商品**：UNIQLO 男裝 合身直筒牛仔褲 482856
* **商品識別碼 (PID)**：`u0000000052984`
* **官方商品頁面**：[UNIQLO 台灣商品頁](https://m.uniqlo.com/tw/product?pid=u0000000052984)
* **基準售價**：NT$ 1,290
* **觸發條件**：即時售價 < NT$ 1,290 時觸發通知

---

## ⚙️ 系統架構與檔案清單

本儲存庫經過精簡整理，僅保留運行價格監控所必需的核心檔案：

| 檔案路徑 | 作用說明 |
| :--- | :--- |
| **`.github/workflows/uniqlo-tracker.yml`** | GitHub Actions 雲端排程設定（每 2 小時定時觸發一次） |
| **`check_price.mjs`** | 價格檢查核心腳本，負責連線官方 API、解析價格並寄發 Email |
| **`package.json`** | 定義專案依賴套件（`nodemailer`） |
| **`last_price.json`** | 價格狀態記錄檔，由 GitHub Actions 自動維護，避免重複發信打擾 |

---

## 🛠️ 技術棧

* **執行環境**：Node.js (v20 / v24)
* **自動化排程**：GitHub Actions (`schedule: cron '0 */2 * * *'`)
* **郵件通知服務**：Nodemailer + Gmail SMTP
* **金鑰安全性**：敏感授權儲存於 GitHub Repository Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
