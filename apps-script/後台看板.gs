/**
 * 友成商務空間｜秘書後台看板（只能看，不能改）
 *
 * 密碼不寫在程式裡，存在「專案設定 → 指令碼屬性」：
 *   屬性名稱：ADMIN_PASSWORD
 *   值：你自己設定的密碼
 *
 * 網頁 admin.html 用 POST 傳 { action: "admin", password: "..." } 過來，
 * 程式碼.gs 的 doPost 一開頭會把這種請求轉給 ad_handle()。
 *
 * 連續輸錯 10 次，會鎖 10 分鐘。
 */

const AD_CONFIG = {
  SPREADSHEET_ID: '1PELnNS61MI5dX1Y2HvJ6XARTiF5MkNNr7XfrUIY0j0I',
  SHEET_NAME: '預約資料',
  CANCEL_SHEET_NAME: '已取消',
  PAY_DAYS: 3,
  MAX_FAILS: 10,
  LOCK_SECONDS: 600,
  TZ: 'Asia/Taipei'
};


function ad_handle(data) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('ad_fails') || 0);
  if (fails >= AD_CONFIG.MAX_FAILS) {
    return { ok: false, message: '密碼錯誤次數太多，請 10 分鐘後再試。' };
  }

  const saved = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!saved) {
    return { ok: false, message: '後台尚未設定密碼（指令碼屬性 ADMIN_PASSWORD）。' };
  }

  if (String(data.password || '') !== saved) {
    cache.put('ad_fails', String(fails + 1), AD_CONFIG.LOCK_SECONDS);
    Utilities.sleep(800);
    return { ok: false, message: '密碼錯誤。' };
  }

  cache.remove('ad_fails');
  return ad_buildDashboard_();
}


function ad_buildDashboard_() {
  const ss = SpreadsheetApp.openById(AD_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(AD_CONFIG.SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const now = new Date();
  const todayKey = Utilities.formatDate(now, AD_CONFIG.TZ, 'yyyy-MM-dd');

  if (values.length <= 1) {
    return { ok: true, generatedAt: ad_fmt_(now), today: todayKey, bookings: [], cancelled: [] };
  }

  const idx = {};
  values[0].forEach((h, i) => { idx[String(h).trim()] = i; });
  const get = (row, name) => (idx[name] === undefined ? '' : row[idx[name]]);

  const bookings = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const status = String(get(row, '狀態')).trim();
    const dateKey = ad_dateKey_(get(row, '日期'));
    if (!status || !dateKey || status === '取消') continue;

    const confirmedAt = get(row, '確認時間');
    const paidCell = get(row, '已收款');
    const paid = status === '已付款' || paidCell === true || String(paidCell).trim() === '是';
    let deadline = '';
    if (status === '已確認' && !paid && confirmedAt instanceof Date) {
      deadline = ad_fmt_(new Date(confirmedAt.getTime() + AD_CONFIG.PAY_DAYS * 86400000));
    }

    // 已過去的日期只保留還需要處理的（待確認、待付款）
    if (dateKey < todayKey && status !== '待確認' && !deadline) continue;

    bookings.push({
      row: r + 1,
      date: dateKey,
      time: String(get(row, '時段')),
      timeCode: String(get(row, '時段代碼')),
      room: String(get(row, '教室')),
      roomCode: String(get(row, '教室代碼')),
      status: status,
      paid: paid,
      deadline: deadline,
      name: String(get(row, '姓名')),
      phone: String(get(row, '電話')),
      email: String(get(row, 'Email')),
      topic: String(get(row, '活動主題')),
      total: get(row, '總金額'),
      bankLast5: String(get(row, '匯款後五碼')),
      note: String(get(row, '備註')),
      createdAt: get(row, '建立時間') instanceof Date ? ad_fmt_(get(row, '建立時間')) : String(get(row, '建立時間'))
    });
  }

  bookings.sort((a, b) => (a.date + a.timeCode).localeCompare(b.date + b.timeCode));

  const cancelled = [];
  const cs = ss.getSheetByName(AD_CONFIG.CANCEL_SHEET_NAME);
  if (cs && cs.getLastRow() > 1) {
    const cv = cs.getDataRange().getValues();
    const cidx = {};
    cv[0].forEach((h, i) => { cidx[String(h).trim()] = i; });
    for (let r = cv.length - 1; r >= 1 && cancelled.length < 10; r--) {
      const row = cv[r];
      cancelled.push({
        date: ad_dateKey_(row[cidx['日期']]),
        time: String(row[cidx['時段']] || ''),
        room: String(row[cidx['教室']] || ''),
        name: String(row[cidx['姓名']] || ''),
        cancelledAt: row[cidx['取消時間']] instanceof Date ? ad_fmt_(row[cidx['取消時間']]) : '',
        reason: String(row[cidx['取消原因']] || '')
      });
    }
  }

  return {
    ok: true,
    generatedAt: ad_fmt_(now),
    today: todayKey,
    sheetUrl: ss.getUrl(),
    bookings: bookings,
    cancelled: cancelled
  };
}


function ad_dateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, AD_CONFIG.TZ, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, AD_CONFIG.TZ, 'yyyy-MM-dd');
}


function ad_fmt_(d) {
  return Utilities.formatDate(d, AD_CONFIG.TZ, 'yyyy-MM-dd HH:mm');
}


/** 測試用：在編輯器執行，看看看板資料有沒有抓到（不需要密碼） */
function ad_test() {
  const r = ad_buildDashboard_();
  Logger.log('共 ' + r.bookings.length + ' 筆進行中的預約，最近取消 ' + r.cancelled.length + ' 筆');
}
