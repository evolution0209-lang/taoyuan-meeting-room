# Supabase 開帳號教學（公司帳號）

> 目的：公司開一個 Supabase 帳號，之後系統都架在公司自己的帳號底下，資料跟帳單都在公司手上。大約 3 分鐘。

## 原始教學

### 一、開帳號
1. 打開這個網址：https://supabase.com/dashboard/sign-up
2. 請用「公司的 Gmail」註冊（不要用個人信箱，以後員工離職才不會帶走）
3. 點「Continue with Google」，選公司的 Gmail 登入

### 二、建組織
4. 第一次登入會叫你建組織（Organization）
   - Name 填：友成團隊
   - Type 選：Company
   - Plan 選：Free（先免費，之後需要升級我再通知老闆綁卡）
5. 按「Create organization」

### 三、把開發者加進來
6. 左邊選單點「Team」
7. 右上角點「Invite member」
8. Email 填：catpawedding@gmail.com
   Role 選：Owner
9. 按「Send invitation」

⚠️ 專案（Project）先不用建，開發者進去之後會建好。
⚠️ 帳號密碼請公司自己保管，不用傳給開發者。

弄好跟開發者說一聲就可以。

---

## 補充注意事項

1. **不一定有 Google 登入**：Supabase 主控台常見的登入方式是 GitHub、Email＋密碼、SSO。畫面上如果沒有「Continue with Google」，就改用「公司 Gmail＋自訂密碼」註冊，結果一樣。
2. **Owner 權限很大**：Owner 可以刪除整個組織、管理帳單、移除其他成員（包括公司自己）。
   - 公司自己的帳號一定要保持 Owner。
   - 開發者可以先給 **Administrator**（建專案、開發通常就夠）；如果確定需要 Owner 也可以，但公司帳號要一直保留 Owner 身分。
   - 各角色權限以 Supabase 當下的官方說明為準。
3. **Free 方案的限制**：免費專案一段時間沒人用會被自動暫停，數量也有上限。測試階段沒問題，系統正式上線前要記得升級付費方案。
