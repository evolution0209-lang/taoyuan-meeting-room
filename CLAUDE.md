# 友成商務空間｜場地租借網頁

## 基本資料
- 場地：友成商務空間，桃園市桃園區中平路98號18樓（亞洲商業大樓）
- 電話：03-220-1818｜教室聯絡人：0938-560-333
- 網址：https://evolution0209-lang.github.io/taoyuan-meeting-room/head-office-rental.html
- 主頁面：`head-office-rental.html`（`index.html` 只是自動跳轉）
- 預約資料：頁面透過 Google Apps Script 讀寫（`script.google.com/macros/...`），不要改動這段串接，除非我明確要求
- 參考標竿：喵爸的聚創空間 https://space.cathome.tw/?lang=zh-TW

## 系統架構（三個地方）
| 部分 | 位置 | 說明 |
|---|---|---|
| 對外網頁 | `head-office-rental.html`（GitHub Pages） | 合併到 main 約 1–2 分鐘後上線 |
| 秘書後台看板 | `admin.html` | 只能看不能改；密碼在 Apps Script 驗證 |
| 預約後端 | Google Apps Script 專案「友成商務空間預約系統」 | 綁在試算表「友成商務空間預約系統」→ 工作表「預約資料」 |

Apps Script 專案編輯器：https://script.google.com/home/projects/1u2FCfKCd1f-SJROPaRMJm-Z6azN1Di3dKN3oBMyyXga87yYryK3kqMBV/edit
- `程式碼.gs`：原本的預約程式（doGet 給月曆資料、doPost 寫入預約、寄信）。doPost 開頭有 3 行：`action === "admin"` 轉給 `ad_handle()`
- `自動取消.gs`：狀態改「已確認」自動記確認時間；3 天內沒「已付款」或沒勾「已收款」→ 每小時自動取消，資料搬到「已取消」工作表
- `後台看板.gs`：秘書看板資料；密碼存在「專案設定 → 指令碼屬性 → ADMIN_PASSWORD」
- 這三個檔案的備份在 repo 的 `apps-script/`（`程式碼.gs` 沒有備份）

### 改後端要注意
- 改完 Apps Script 要「💾 儲存」；動到 doGet / doPost 還要「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」（網址不變）
- 儲存、執行、部署由使用者本人按；Claude 可以在內建瀏覽器把程式放進編輯器
- `admin.html` 送 `{action:"admin"}` 給 doPost；如果後端沒有那 3 行，會被當成新預約寫入，所以不要拿掉

### 預約狀態流程
待確認（網頁送出）→ 已確認（工作人員確認檔期，開始算 3 天）→ 已付款（或勾已收款）
其他狀態：暫保留、內部使用、取消。安裝自動取消前的舊「已確認」資料沒有確認時間，不會被取消。

## 目前網頁規則（經營決策，改之前要問我）
- 線上預約開放範圍：今天起 3 個月內（自動往後推），更遠的請來電
- 退費：14 天以上全退／7–13 天 85%／6 天內（含當日）70%；天災等不可抗力全退
- 浮動按鈕：立即預約＋撥打電話（還沒有 LINE 官方帳號，有了就換成 LINE 諮詢）

## 目標
客人用手機打開，30 秒內看懂「多少人、多少錢、怎麼訂」，並且馬上預約或用 LINE 詢問。

## 工作規則
- 一律使用繁體中文（台灣用語）
- 價格、時段、地址、電話、退費規則屬於經營決策，不能自己編或改，不確定就先問我
- 動手修改前，先說明要改什麼、為什麼改，我同意後才改
- 一次只做一項優化，改完給我看預覽
- 手機版優先，每次改完都要檢查手機畫面
- 比較、計畫等文件放在 `docs/`，照片放在 `images/`

## 文件
- `docs/喵爸網站比較.md`：兩個網站的逐項比較
- `docs/優化計畫.md`：待辦的優化項目與進度
