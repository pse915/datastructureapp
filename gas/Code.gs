/** Google Apps Script Web App 프록시 (선택 방식 B).
 *  Streamlit 백엔드 없이 React가 직접 Sheets/Drive에 접근해야 할 때 사용.
 *  스크립트 편집기(extensions > Apps Script)에 붙여넣고
 *  배포 > 웹앱으로 배포 (액세스: 나만 / 익명 아님 권장).
 */
const SHEET_ID = 'YOUR_SPREADSHEET_ID';
const TOKEN = 'CHANGE_TO_LONG_RANDOM_TOKEN';
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';

function sheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName('학습지');
}

function check_(b) {
  if (b.token !== TOKEN) throw new Error('unauthorized');
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    check_(b);
    if (b.op === 'save') {
      const sh = sheet_();
      const rows = sh.getDataRange().getValues();
      const line = [
        b.worksheet.week, b.worksheet.title, b.worksheet.unit, b.worksheet.guide,
        b.worksheet.published ? 'Y' : 'N',
        JSON.stringify(b.worksheet.questions), new Date()
      ];
      let idx = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(b.worksheet.week)) { idx = i + 1; break; }
      }
      if (idx > 0) sh.getRange(idx, 1, 1, 7).setValues([line]);
      else sh.appendRow(line);
      return json_({ ok: true });
    }
    if (b.op === 'load') {
      const sh = sheet_();
      const rows = sh.getDataRange().getValues();
      const f = rows.slice(1).find(r => String(r[0]) === String(b.week));
      if (!f) return json_({ ok: true, row: null });
      return json_({
        ok: true,
        row: {
          week: Number(f[0]), title: f[1], unit: f[2], guide: f[3],
          published: String(f[4]).toUpperCase() !== 'N',
          questions: JSON.parse(f[5] || '[]'), updatedAt: String(f[6] || '')
        }
      });
    }
    if (b.op === 'image') {
      // b: { fileName, base64, mime }
      const blob = Utilities.newBlob(
        Utilities.base64Decode(b.base64), b.mime || 'image/png', b.fileName);
      const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return json_({ ok: true, fileId: file.getId(), viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view' });
    }
    return json_({ ok: false, error: 'unknown op' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
