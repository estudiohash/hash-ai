/**
 * Code.gs
 * ---------------------------------------------------------------------------
 * PUENTE de lectura/escritura entre HASH y Google Sheets.
 *
 * Este archivo NO es parte del proyecto HASH (no corre en el navegador).
 * Es el código instalado en Extensiones > Apps Script DE LA HOJA, y
 * publicado como "Web App". HASH le hace peticiones HTTP a la URL que
 * expone (termina en /exec), nunca ejecuta este archivo directamente.
 *
 * Por qué hace falta esto:
 * El link "Publicar en la web > CSV" de Google Sheets es de SOLO LECTURA.
 * Google no expone ninguna forma de escribir a través de ese link, bajo
 * ninguna circunstancia. La única manera de escribir en una hoja desde
 * una página web sin backend propio es a través de un Apps Script
 * publicado como Web App: ese script sí tiene permiso para escribir,
 * porque corre con el mismo usuario que es dueño de la hoja.
 *
 * IMPORTANTE — esto es solo un puente de transporte, no es "memoria" ni
 * "inteligencia": guarda/devuelve mensajes tal cual. No interpreta, no
 * decide, no transforma el contenido. Es reemplazable: el día que HASH
 * deje de usar Google Sheets, este archivo se borra y no afecta en nada
 * a la arquitectura de HASH (ver README, sección "Almacenamiento externo").
 *
 * ---------------------------------------------------------------------------
 * CONTRATO (cómo lo usa HASH hoy)
 * ---------------------------------------------------------------------------
 * GET  ?front=<frontId>
 *   -> { ok: true, messages: [{id, front, message, created_at}, ...] }
 *      (HASH no usa esto activamente todavía: la lectura normal va por
 *      el CSV publicado. Queda disponible para uso futuro/manual.)
 *
 * POST body JSON: { action: 'saveMessage', data: { id, front, message, created_at } }
 *   -> { ok: true }  si se pudo agregar la fila
 *   -> { ok: false, error: '...' }  si falló (campo faltante, hoja no
 *      encontrada, etc.) — HASH muestra ese error tal cual en la UI.
 *
 * El emisor de estas peticiones es js/datasources/googleSheetsSource.js
 * (función saveMessage). Si se cambia el formato de un lado, hay que
 * actualizar el otro a juego.
 *
 * ---------------------------------------------------------------------------
 * SI HAY QUE REINSTALARLO DESDE CERO (cuenta nueva, hoja nueva, etc.)
 * ---------------------------------------------------------------------------
 * 1. Abrí la hoja de Google Sheets (columnas id, front, message, created_at).
 * 2. Extensiones > Apps Script.
 * 3. Borrá todo el contenido del editor y pegá ESTE ARCHIVO completo.
 * 4. Actualizá SPREADSHEET_ID más abajo con el ID de esa hoja (está en la
 *    URL de la hoja: .../spreadsheets/d/ESTE_ID/edit).
 * 5. Arriba a la derecha: "Implementar" > "Nueva implementación".
 * 6. Tipo: "Aplicación web".
 *      - Ejecutar como: "Yo" (tu cuenta, la dueña de la hoja)
 *      - Quién tiene acceso: "Cualquier usuario"   ← CRÍTICO. Con "Solo yo"
 *        Google redirige a una pantalla de error de Drive en vez de
 *        ejecutar el script para cualquiera que no sea esa sesión exacta.
 * 7. "Implementar". Aceptá los permisos que pida Google.
 * 8. Copiá la URL ("URL de la aplicación web", termina en /exec).
 * 9. Pegá esa URL en HASH: js/config.js, en
 *    dataSource.settings['google-sheets'].writeUrl
 *
 * Si modificás este script y volvés a implementar, usá "Gestionar
 * implementaciones > editar la existente" para mantener la misma URL
 * (si no, Google da una URL nueva y hay que actualizar config.js).
 * ---------------------------------------------------------------------------
 */

const SPREADSHEET_ID = '1SSlN270gdgIEPTCa7wvzAkm67fRB8atNUyQZowOX-dg';
const SHEET_NAME = 'Sheet1';

/**
 * Lectura por frente: ?front=<frontId>
 * HASH no la usa activamente hoy (lee por CSV publicado), pero queda
 * disponible para consultas manuales o uso futuro.
 */
function doGet(e) {
  try {
    const frontId = e.parameter.front;
    if (!frontId) {
      return jsonResponse({ ok: false, error: 'Falta el parámetro front.' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) return jsonResponse({ ok: false, error: 'No se pudo abrir el spreadsheet. ID: ' + SPREADSHEET_ID });

    const sheets = ss.getSheets().map(s => s.getName());
    if (!sheets.includes(SHEET_NAME)) {
      return jsonResponse({ ok: false, error: 'Hoja no encontrada. Hojas disponibles: ' + sheets.join(', ') });
    }

    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
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
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
  }
}

/**
 * Escritura: body JSON { action: 'saveMessage', data: {id, front, message, created_at} }
 * Es lo que llama js/datasources/googleSheetsSource.js -> saveMessage().
 */
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_NAME + '".');
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
