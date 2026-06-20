const SHEET_NAME = 'Sheet1';

function doGet(e) {
  try {
    const frontId = e.parameter.front;
    if (!frontId) {
      return jsonResponse({ ok: false, error: 'Falta el parámetro front.' });
    }

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    // Fila 0 = encabezados: id, front, message, created_at
    const messages = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[1]) === frontId) {
        messages.push({
          id:         String(row[0]),
          front:      String(row[1]),
          message:    String(row[2]),
          created_at: String(row[3]),
        });
      }
    }

    return jsonResponse({ ok: true, messages: messages });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const sheet = getSheet();
    const body = JSON.parse(e.postData.contents);

    if (body.action !== 'saveMessage') {
      return jsonResponse({ ok: false, error: 'Acción desconocida: ' + body.action });
    }

    const d = body.data;
    const requeridos = ['id', 'front', 'message', 'created_at'];
    const faltantes = requeridos.filter(c => !d[c]);
    if (faltantes.length) {
      return jsonResponse({ ok: false, error: 'Faltan campos: ' + faltantes.join(', ') });
    }

    sheet.appendRow([d.id, d.front, d.message, d.created_at]);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_NAME + '".');
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
