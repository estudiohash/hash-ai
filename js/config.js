/**
 * config.js
 * ---------------------------------------------------------------------------
 * PUNTO ÚNICO DE CONFIGURACIÓN del almacenamiento externo de HASH.
 *
 * Esta es la única parte del proyecto que hay que tocar para cambiar
 * dónde se respaldan las conversaciones (hoy Google Sheets, mañana otra
 * cosa, o ninguna).
 *
 * Principio de arquitectura (ver el README, sección "Almacenamiento
 * externo"): la fuente de verdad de HASH es siempre su storage local
 * (localStorage hoy; lo que sea mañana). Lo que se configura acá es
 * almacenamiento de respaldo/replicación, NUNCA una fuente de la que
 * HASH dependa para funcionar, razonar o construir su memoria. HASH
 * sigue funcionando igual si esta fuente está caída, mal configurada,
 * o directamente no existe (`type: 'local'`).
 *
 * Nada en storage.js, ui.js ni app.js debería saber qué fuente está
 * activa: todos hablan con `DataSourceFactory.getActiveSource()`, que
 * lee este archivo y devuelve el adaptador correspondiente. Ver:
 *   js/datasources/dataSourceFactory.js
 *
 * Para cambiar de fuente:
 *   1. Cambiar HASH_CONFIG.dataSource.type
 *   2. Completar los parámetros que esa fuente necesite
 *   3. Nada más. El resto de la app sigue funcionando igual.
 * ---------------------------------------------------------------------------
 */

const HASH_CONFIG = {

  dataSource: {

    // Fuente activa. Valores soportados hoy: 'google-sheets' | 'local'
    // Cualquier fuente futura (otro almacenamiento, un backend propio de
    // HASH, etc.) se suma del mismo modo: ver dataSourceFactory.js.
    type: 'google-sheets',

    // Parámetros específicos de cada fuente. Cada adaptador lee solo el
    // bloque que le corresponde según `type`.
    settings: {

      'google-sheets': {
        // LECTURA. URL del CSV publicado
        // (Archivo > Compartir > Publicar en la web > CSV).
        csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKqPyj3dDHxX4tvoweg4OTCoH6t_USMsnHb1kENrOV3FNk54CutuZyHzfwLgIXyT9aOVfm44XCkpKJ/pub?output=csv',

        // ESCRITURA. URL del puente de Google Apps Script (termina en
        // "/exec"). El CSV publicado de arriba es de SOLO LECTURA: Google
        // no permite escribir a través de él bajo ninguna circunstancia.
        // Sin esta URL, los mensajes se siguen guardando en HASH
        // normalmente, pero no se replican hacia la hoja.
        //
        // Cómo conseguir esta URL: ver el README, sección "Almacenamiento
        // externo" (instalación de ~2 minutos, una sola vez).
        writeUrl: '',
      },

      'local': {
        // La fuente local no necesita parámetros: usa los datos
        // ya guardados en localStorage (comportamiento base de HASH,
        // sin ningún almacenamiento externo).
      },

    },

  },

};
