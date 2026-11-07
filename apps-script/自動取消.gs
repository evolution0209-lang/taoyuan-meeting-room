/**
 * 友成商務空間｜逾期未匯款自動取消
 *
 * 使用方式（工作人員）：
 *   1. 確認檔期後，把「狀態」改成「已確認」→ 系統自動在「確認時間」欄記下時間
 *   2. 收到匯款後，在「已收款」欄打勾
 *   3. 「已確認」超過 3 天仍沒打勾 → 系統每小時檢查一次，自動取消
 *
 * 被取消的資料會搬到「已取消」工作表保存（不會消失），
 * 並從「預約資料」移除，網頁月曆上的時段就會釋出。
 *
 * 安裝前就已經是「已確認」的舊資料沒有確認時間，不會被取消。
 * 「內部使用」「待確認」不受影響。
 *
 * 這個檔案和原本的預約程式互不干擾：所有函式都用 ac_ 開頭。
 */

const AC_CONFIG = {
  SPREADSHEET_ID: '1PELnNS61MI5dX1Y2HvJ6XARTiF5MkNNr7XfrUIY0j0I',
  SHEET_NAME: '預約資料',
  CANCEL_SHEET_NAME: '已取消',

  CONFIRMED_STATUS: '已確認',
  CANCELLED_STATUS: '已取消',
  PAY_DAYS: 3,

  // 欄位位置（A=1, B=2 ...）
  NAME_COL: 3,          // C 姓名
  EMAIL_COL: 4,         // D Email
  ROOM_COL: 8,          // H 教室
  DATE_COL: 10,         // J 日期
  TIME_COL: 11,         // K 時段
  STATUS_COL: 2,        // B 狀態
  CONFIRM_TIME_COL: 22, // V 確認時間（自動新增）
  PAID_COL: 23,         // W 已收款（自動新增，打勾）

  // 取消時寄信通知管理者
  ADMIN_EMAIL: 'evolution0209@gmail.com',
  // 是否同時寄信通知客人（改成 true 就會寄）
  NOTIFY_CUSTOMER: false,
};


/** 第一次安裝：在 Apps Script 選這個函式按「執行」一次就好 */
function ac_setup() {
  const ss = SpreadsheetApp.openById(AC_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(AC_CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('找不到工作表：' + AC_CONFIG.SHEET_NAME);

  sheet.getRange(1, AC_CONFIG.CONFIRM_TIME_COL).setValue('確認時間');
  sheet.getRange(1, AC_CONFIG.PAID_COL).setValue('已收款');
  ac_cleanupCheckboxes();

  // 先清掉舊的同名觸發條件，避免重複
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['ac_onEdit', 'ac_autoCancel'].indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('ac_onEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('ac_autoCancel').timeBased().everyHours(1).create();

  Logger.log('✅ 設定完成：狀態改成「已確認」會自動記時間，每小時檢查一次逾期未付款。');
}


/**
 * 勾選框只放在有資料的列；空白列的勾選框移除，
 * 避免網頁新預約被寫到很下面的空白列。
 */
function ac_cleanupCheckboxes() {
  const sheet = SpreadsheetApp.openById(AC_CONFIG.SPREADSHEET_ID).getSheetByName(AC_CONFIG.SHEET_NAME);
  const maxRows = sheet.getMaxRows();
  const colA = sheet.getRange(1, 1, maxRows, 1).getValues();

  let lastDataRow = 1;
  for (let i = colA.length - 1; i >= 1; i--) {
    if (String(colA[i][0]).trim() !== '') { lastDataRow = i + 1; break; }
  }

  if (lastDataRow >= 2) {
    sheet.getRange(2, AC_CONFIG.PAID_COL, lastDataRow - 1, 1).insertCheckboxes();
  }
  if (maxRows > lastDataRow) {
    const empty = sheet.getRange(lastDataRow + 1, AC_CONFIG.PAID_COL, maxRows - lastDataRow, 1);
    empty.removeCheckboxes();
    empty.clearContent();
    empty.clearDataValidations();
  }
  Logger.log('✅ 勾選框已整理：只保留第 2～' + lastDataRow + ' 列。');
}


/** 狀態改成「已確認」時，自動記下確認時間 */
function ac_onEdit(e) {
  if (!e || !e.range) return;
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== AC_CONFIG.SHEET_NAME) return;

  const col = AC_CONFIG.STATUS_COL;
  if (range.getColumn() > col || range.getLastColumn() < col) return;

  for (let r = Math.max(range.getRow(), 2); r <= range.getLastRow(); r++) {
    const status = String(sheet.getRange(r, col).getValue()).trim();
    const timeCell = sheet.getRange(r, AC_CONFIG.CONFIRM_TIME_COL);
    if (status === AC_CONFIG.CONFIRMED_STATUS && !timeCell.getValue()) {
      timeCell.setValue(new Date());
      sheet.getRange(r, AC_CONFIG.PAID_COL).insertCheckboxes();
    }
  }
}


/** 找出逾期未付款的資料（不會改任何東西） */
function ac_findExpired_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { header: [], expired: [] };

  const lastCol = Math.max(sheet.getLastColumn(), AC_CONFIG.PAID_COL);
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const limitMs = AC_CONFIG.PAY_DAYS * 24 * 60 * 60 * 1000;
  const now = new Date();

  const expired = [];
  data.forEach((row, i) => {
    const status = String(row[AC_CONFIG.STATUS_COL - 1]).trim();
    const confirmedAt = row[AC_CONFIG.CONFIRM_TIME_COL - 1];
    const paid = row[AC_CONFIG.PAID_COL - 1];
    const isPaid = paid === true || String(paid).trim() === '是' || String(paid).toUpperCase() === 'TRUE';

    if (status !== AC_CONFIG.CONFIRMED_STATUS) return;
    if (!(confirmedAt instanceof Date)) return; // 舊資料沒有確認時間 → 不處理
    if (isPaid) return;
    if (now - confirmedAt < limitMs) return;

    expired.push({ rowNum: i + 2, row: row });
  });

  return { header: header, expired: expired };
}


/** 試跑：只列出「如果現在執行會取消哪些」，不會真的取消 */
function ac_dryRun() {
  const sheet = SpreadsheetApp.openById(AC_CONFIG.SPREADSHEET_ID).getSheetByName(AC_CONFIG.SHEET_NAME);
  const result = ac_findExpired_(sheet);
  if (!result.expired.length) {
    Logger.log('目前沒有逾期未付款的預約。');
    return;
  }
  result.expired.forEach(x => Logger.log('第 ' + x.rowNum + ' 列：' + ac_describe_(x.row)));
}


/** 每小時自動執行：取消逾期未付款的預約 */
function ac_autoCancel() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    const ss = SpreadsheetApp.openById(AC_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(AC_CONFIG.SHEET_NAME);
    const result = ac_findExpired_(sheet);
    if (!result.expired.length) return;

    let cancelSheet = ss.getSheetByName(AC_CONFIG.CANCEL_SHEET_NAME);
    if (!cancelSheet) {
      cancelSheet = ss.insertSheet(AC_CONFIG.CANCEL_SHEET_NAME);
      cancelSheet.appendRow(result.header.concat(['取消時間', '取消原因']));
    }

    const now = new Date();
    const reason = '確認後 ' + AC_CONFIG.PAY_DAYS + ' 天內未匯款，系統自動取消';

    result.expired.forEach(x => {
      const copy = x.row.slice();
      copy[AC_CONFIG.STATUS_COL - 1] = AC_CONFIG.CANCELLED_STATUS;
      cancelSheet.appendRow(copy.concat([now, reason]));
    });

    // 從最下面開始刪，列號才不會跑掉
    result.expired
      .map(x => x.rowNum)
      .sort((a, b) => b - a)
      .forEach(rowNum => sheet.deleteRow(rowNum));

    ac_notify_(result.expired);
  } finally {
    lock.releaseLock();
  }
}


function ac_describe_(row) {
  const date = row[AC_CONFIG.DATE_COL - 1];
  const dateText = date instanceof Date
    ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : String(date);
  return [row[AC_CONFIG.NAME_COL - 1], row[AC_CONFIG.ROOM_COL - 1], dateText, row[AC_CONFIG.TIME_COL - 1]].join('｜');
}


function ac_notify_(expired) {
  const lines = expired.map(x => '・' + ac_describe_(x.row));

  if (AC_CONFIG.ADMIN_EMAIL) {
    MailApp.sendEmail(
      AC_CONFIG.ADMIN_EMAIL,
      '【友成商務空間】' + expired.length + ' 筆預約逾期未匯款，已自動取消',
      '以下預約確認後 ' + AC_CONFIG.PAY_DAYS + ' 天內未收到匯款，系統已自動取消並釋出時段：\n\n' +
      lines.join('\n') +
      '\n\n完整資料已移到試算表的「已取消」工作表。'
    );
  }

  if (AC_CONFIG.NOTIFY_CUSTOMER) {
    expired.forEach(x => {
      const email = String(x.row[AC_CONFIG.EMAIL_COL - 1]).trim();
      if (!email || email.indexOf('@') === -1) return;
      MailApp.sendEmail(
        email,
        '【友成商務空間】您的場地預約已取消（逾期未匯款）',
        x.row[AC_CONFIG.NAME_COL - 1] + ' 您好：\n\n' +
        '您預約的「' + ac_describe_(x.row) + '」因確認後 ' + AC_CONFIG.PAY_DAYS + ' 天內未收到匯款，' +
        '系統已自動取消並釋出時段。\n\n如仍需使用，歡迎重新上網預約，或來電 03-220-1818。\n\n友成商務空間'
      );
    });
  }
}
