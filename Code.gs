const SHEET_NAME = 'Sheet1';
const FRONTS_SHEET_NAME = 'fronts';

function doGet(e) {
  try {
    // GET ?resource=fronts → devuelve la lista de chats
    if (e.parameter.resource === 'fronts') {
      const sheet = getFrontsSheet();
      const data = sheet.getDataRange().getValues();
      // Fila 0 = encabezados: id, name, description, created_at
      const fronts = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // fila vacía
        fronts.push({
          id:          String(row[0]),
          name:        String(row[1]),
          description: String(row[2]),
          created_at:  String(row[3]),
        });
      }
      return jsonResponse({ ok: true, fronts: fronts });
    }

    // GET ?front=X → devuelve mensajes del frente (comportamiento original)
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
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'saveFront') {
      const sheet = getFrontsSheet();
      const d = body.data;
      const requeridos = ['id', 'name', 'created_at'];
      const faltantes = requeridos.filter(c => !d[c]);
      if (faltantes.length) {
        return jsonResponse({ ok: false, error: 'Faltan campos: ' + faltantes.join(', ') });
      }
      sheet.appendRow([d.id, d.name, d.description || '', d.created_at]);
      return jsonResponse({ ok: true });
    }

    if (body.action === 'saveMessage') {
      const sheet = getSheet();
      const d = body.data;
      const requeridos = ['id', 'front', 'message', 'created_at'];
      const faltantes = requeridos.filter(c => !d[c]);
      if (faltantes.length) {
        return jsonResponse({ ok: false, error: 'Faltan campos: ' + faltantes.join(', ') });
      }
      sheet.appendRow([d.id, d.front, d.message, d.created_at]);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Acción desconocida: ' + body.action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function getSheet() {
  const sheet = SpreadsheetApp.openById('1SSlN270gdgIEPTCa7wvzAkm67fRB8atNUyQZowOX-dg').getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_NAME + '".');
  return sheet;
}

function getFrontsSheet() {
  const sheet = SpreadsheetApp.openById('1SSlN270gdgIEPTCa7wvzAkm67fRB8atNUyQZowOX-dg').getSheetByName(FRONTS_SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + FRONTS_SHEET_NAME + '".');
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
