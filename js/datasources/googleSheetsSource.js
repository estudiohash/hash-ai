/**
 * googleSheetsSource.js
 * ---------------------------------------------------------------------------
 * Adaptador de almacenamiento externo: Google Sheets.
 *
 * Implementa el contrato descrito en dataSourceInterface.js:
 *   - fetchConversations()  -> LECTURA, vía el CSV publicado (csvUrl)
 *   - saveMessage(mensaje)  -> ESCRITURA, vía un puente de Google Apps
 *                              Script publicado como Web App (writeUrl)
 *
 * Por qué dos URLs distintas:
 * El link "Publicar en la web > CSV" de Google es de SOLO LECTURA; Google
 * no permite escribir a través de él. Para escribir hace falta un Apps
 * Script propio publicado como Web App, que sí tiene permiso para agregar
 * filas. El código de ese puente y su instalación están documentados en
 * /apps-script/ (carpeta separada, no se ejecuta dentro de HASH).
 *
 * Nadie fuera de este archivo necesita saber que la fuente es un CSV o
 * un Apps Script, ni cómo están nombradas sus columnas.
 *
 * Columnas esperadas en la hoja (no sensibles a mayúsculas/acentos/orden;
 * incluye los alias en inglés "id, front, message, created_at"):
 *   - frente / frontId / contexto / front     -> a qué frente pertenece
 *   - mensaje / texto / contenido / message    -> contenido del mensaje
 *   - fecha / timestamp / date / created_at    -> cuándo se registró
 *   - autor / author                            -> opcional
 *
 * Si la hoja no trae alguna columna, se usan valores por defecto
 * razonables en vez de romper la carga completa.
 *
 * Recordatorio de arquitectura (ver /docs/decisiones-arquitectura.md):
 * este adaptador es almacenamiento, no inteligencia. HASH no consulta
 * esta hoja para razonar ni para enriquecer su memoria; solo la usa
 * como destino/origen de respaldo de lo que ya vive en el storage local.
 * ---------------------------------------------------------------------------
 */

const GoogleSheetsSource = (() => {

  /**
   * Mapas de nombres de columna aceptados -> campo interno.
   * Todo en minúsculas y sin acentos para comparar de forma tolerante.
   */
  const COLUMN_ALIASES = {
    frontId: ['frente', 'frentid', 'frontid', 'contexto', 'front'],
    texto: ['mensaje', 'texto', 'contenido', 'message'],
    timestamp: ['fecha', 'timestamp', 'date', 'created_at', 'createdat'],
    autor: ['autor', 'author'],
  };

  function buildSource(settings) {
    if (!settings || !settings.csvUrl) {
      throw new Error('GoogleSheetsSource: falta "csvUrl" en la configuración.');
    }

    return {
      async fetchConversations() {
        const csvText = await downloadCsv(settings.csvUrl);
        const rows = parseCsv(csvText);
        return normalizeRows(rows);
      },

      async saveMessage(mensaje) {
        if (!settings.writeUrl) {
          throw new Error(
            'GoogleSheetsSource: falta "writeUrl" en la configuración. ' +
            'Sin esa URL no es posible escribir en la hoja (el CSV publicado ' +
            'es de solo lectura). Ver /apps-script/README.md para instalar ' +
            'el puente de escritura y obtener esa URL.'
          );
        }

        const payload = {
          id: mensaje.id,
          front: mensaje.frontId,
          message: mensaje.texto,
          created_at: new Date(mensaje.timestamp).toISOString(),
        };

        await sendToWriteBridge(settings.writeUrl, payload);
      },
    };
  }

  async function sendToWriteBridge(writeUrl, payload) {
    let response;
    try {
      response = await fetch(writeUrl, {
        method: 'POST',
        // 'text/plain' evita un preflight CORS extra: Apps Script igual
        // recibe el body y lo parsea como JSON en doPost(e).
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error(`GoogleSheetsSource: no se pudo contactar el puente de escritura (${err.message}).`);
    }

    if (!response.ok) {
      throw new Error(`GoogleSheetsSource: el puente de escritura respondió con estado ${response.status}.`);
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch (err) {
      throw new Error('GoogleSheetsSource: el puente de escritura devolvió una respuesta inesperada.');
    }

    if (!resultado.ok) {
      throw new Error(`GoogleSheetsSource: el puente de escritura reportó un error (${resultado.error || 'desconocido'}).`);
    }
  }

  async function downloadCsv(url) {
    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(`GoogleSheetsSource: no se pudo acceder a la hoja (${err.message}).`);
    }

    if (!response.ok) {
      throw new Error(`GoogleSheetsSource: la hoja respondió con estado ${response.status}.`);
    }

    return response.text();
  }

  /**
   * Parser de CSV simple pero correcto: soporta comas dentro de campos
   * citados con comillas dobles y comillas escapadas ("").
   * Suficiente para CSVs exportados por Google Sheets.
   */
  function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let insideQuotes = false;

    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (insideQuotes) {
        if (char === '"' && next === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          insideQuotes = false;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        insideQuotes = true;
        continue;
      }

      if (char === ',') {
        row.push(field);
        field = '';
        continue;
      }

      if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }

      field += char;
    }

    // Último campo/fila pendiente, si el archivo no termina en salto de línea.
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  }

  /**
   * Convierte filas crudas de CSV (con headers en la primera fila) en
   * mensajes normalizados al esquema interno de HASH.
   */
  function normalizeRows(rows) {
    if (rows.length === 0) return [];

    const headers = rows[0].map(normalizeHeader);
    const dataRows = rows.slice(1);

    const columnIndex = resolveColumnIndexes(headers);

    return dataRows
      .map((row) => rowToMessage(row, columnIndex))
      .filter((mensaje) => mensaje !== null);
  }

  function normalizeHeader(header) {
    return header
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // quita acentos
  }

  /** Para cada campo interno, encuentra en qué índice de columna está. */
  function resolveColumnIndexes(headers) {
    const index = {};

    Object.keys(COLUMN_ALIASES).forEach((campoInterno) => {
      const alias = COLUMN_ALIASES[campoInterno];
      const found = headers.findIndex((h) => alias.includes(h));
      index[campoInterno] = found; // -1 si no se encontró
    });

    return index;
  }

  function rowToMessage(row, columnIndex) {
    const texto = getCell(row, columnIndex.texto);

    // Sin texto, la fila no es un mensaje válido: se descarta.
    if (!texto) return null;

    const frontId = getCell(row, columnIndex.frontId) || 'personal';
    const fechaRaw = getCell(row, columnIndex.timestamp);
    const autor = getCell(row, columnIndex.autor) || null;

    return {
      frontId: slugify(frontId),
      texto,
      timestamp: parseTimestamp(fechaRaw),
      autor,
    };
  }

  function getCell(row, index) {
    if (index === undefined || index < 0) return '';
    return (row[index] || '').trim();
  }

  function slugify(valor) {
    return valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function parseTimestamp(fechaRaw) {
    if (!fechaRaw) return Date.now();

    const parsed = Date.parse(fechaRaw);
    if (!Number.isNaN(parsed)) return parsed;

    // Intento adicional para formato dd/mm/yyyy, común en hojas en español.
    const match = fechaRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const [, d, m, y] = match;
      const year = y.length === 2 ? `20${y}` : y;
      const fallback = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      if (!Number.isNaN(fallback.getTime())) return fallback.getTime();
    }

    return Date.now();
  }

  return { buildSource };

})();
