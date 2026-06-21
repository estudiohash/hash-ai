/**
 * Code.gs
 * ---------------------------------------------------------------------------
 * PUENTE DE ESCRITURA entre HASH y Google Sheets.
 *
 * Este archivo NO es parte del proyecto HASH (no corre en el navegador).
 * Es el código que hay que pegar en el editor de Apps Script DE LA HOJA,
 * y publicar como "Web App". Una vez publicado, da una URL que HASH usa
 * para insertar filas nuevas.
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
 * "inteligencia": recibe un mensaje y lo agrega como fila. No interpreta,
 * no decide, no transforma el contenido. Es reemplazable: el día que HASH
 * deje de usar Google Sheets, este archivo se borra y no afecta en nada
 * a la arquitectura de HASH (ver ADR-001 en /docs).
 *
 * ---------------------------------------------------------------------------
 * CÓMO INSTALARLO (una sola vez, dura ~2 minutos)
 * ---------------------------------------------------------------------------
 * 1. Abrí tu hoja de Google Sheets (la misma que ya tiene las columnas
 *    id, front, message, created_at).
 * 2. Extensiones > Apps Script.
 * 3. Borrá todo el contenido del editor y pegá ESTE ARCHIVO completo.
 * 4. Arriba a la derecha: "Implementar" > "Nueva implementación".
 * 5. Tipo: "Aplicación web".
 *      - Ejecutar como: "Yo" (tu cuenta, la dueña de la hoja)
 *      - Quién tiene acceso: "Cualquier usuario"
 * 6. "Implementar". Google va a pedir autorización: aceptá los permisos
 *    (el script solo edita ESTA hoja, nada más).
 * 7. Copiá la URL que te da ("URL de la aplicación web", termina en /exec).
 * 8. Pegá esa URL en HASH: js/config.js, en
 *    dataSource.settings['google-sheets'].writeUrl
 *
 * Si en el futuro modificás este script y volvés a "Implementar", Google
 * te va a dar una URL NUEVA. Hay que actualizar config.js con la nueva URL
 * (o usar "Gestionar implementaciones" > editar la existente, para
 * mantener la misma URL).
 * ---------------------------------------------------------------------------
 */

// Nombre de la pestaña/hoja donde están las columnas id, front, message, created_at.
// Cambiar acá si tu pestaña no se llama "Sheet1".
const SHEET_NAME = 'Sheet1';

/**
 * Maneja peticiones POST. HASH manda acá cada mensaje nuevo como JSON:
 *   { id, front, message, created_at }
 * y esta función lo agrega como una fila nueva al final de la hoja.
 */
function doPost(e) {
  try {
    const sheet = getSheet();
    const datos = JSON.parse(e.postData.contents);

    validarCampos(datos);

    sheet.appendRow([
      datos.id,
      datos.front,
      datos.message,
      datos.created_at,
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * GET de cortesía: sirve para probar desde el navegador que el script
 * está bien publicado, sin necesidad de mandar un POST.
 */
function doGet(e) {
  return jsonResponse({ ok: true, info: 'Puente de escritura HASH -> Sheets activo.' });
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('No se encontró la hoja "' + SHEET_NAME + '". Revisá SHEET_NAME en el script.');
  }
  return sheet;
}

function validarCampos(datos) {
  const requeridos = ['id', 'front', 'message', 'created_at'];
  const faltantes = requeridos.filter((campo) => !datos[campo]);
  if (faltantes.length > 0) {
    throw new Error('Faltan campos: ' + faltantes.join(', '));
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
