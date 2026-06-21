/**
 * dataSourceFactory.js
 * ---------------------------------------------------------------------------
 * Único lugar del proyecto que decide QUÉ almacenamiento externo está
 * activo.
 *
 * Lee HASH_CONFIG (config.js) y devuelve una instancia que cumple el
 * contrato de dataSourceInterface.js. storage.js le pide datos a esto,
 * sin saber ni importarle si por detrás hay un CSV de Google Sheets,
 * localStorage, o cualquier otra cosa en el futuro.
 *
 * Importante (ver /docs/decisiones-arquitectura.md, ADR-001): esto es un
 * registro de destinos de ALMACENAMIENTO, no de fuentes de conocimiento
 * o inteligencia. HASH no consulta estas fuentes para razonar; las usa
 * únicamente para guardar/recuperar una copia de lo que ya vive en su
 * storage local. Cualquier entrada de este registro es reemplazable sin
 * impacto en el resto del sistema.
 *
 * Para agregar un almacenamiento nuevo (ej: otra hoja de cálculo, un
 * backend propio de HASH, un archivo local):
 *   1. Crear js/datasources/miNuevoAlmacenamiento.js cumpliendo el contrato.
 *   2. Sumarlo al objeto REGISTRY de abajo.
 *   3. Apuntar HASH_CONFIG.dataSource.type a su nombre en config.js.
 * Nada más cambia.
 * ---------------------------------------------------------------------------
 */

const DataSourceFactory = (() => {

  // Registro de adaptadores de almacenamiento disponibles. La clave
  // coincide con los valores válidos de HASH_CONFIG.dataSource.type.
  const REGISTRY = {
    'google-sheets': GoogleSheetsSource,
    'local': LocalSource,
  };

  /**
   * Devuelve el almacenamiento activo, ya configurado y listo para usar
   * (con `.fetchConversations()` disponible, y `.saveMessage()` si ese
   * almacenamiento admite escritura).
   */
  function getActiveSource() {
    const config = HASH_CONFIG.dataSource;
    const adapter = REGISTRY[config.type];

    if (!adapter) {
      throw new Error(
        `DataSourceFactory: tipo de almacenamiento desconocido "${config.type}". ` +
        `Tipos disponibles: ${Object.keys(REGISTRY).join(', ')}.`
      );
    }

    const settings = config.settings[config.type] || {};
    return adapter.buildSource(settings);
  }

  return { getActiveSource };

})();
