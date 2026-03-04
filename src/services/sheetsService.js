/**
 * Serviço atualizado para buscar dados brutos das 3 abas para que a lógica fique no App
 * ID da Planilha: 18-EHWUjs02gmFFrD2V17rD3WqouPEcggsft4vf8CGj8
 */

const SPREADSHEET_ID = '18-EHWUjs02gmFFrD2V17rD3WqouPEcggsft4vf8CGj8';

const fetchSheetTab = async (sheetName) => {
  const queryUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

  try {
    const response = await fetch(queryUrl);
    const text = await response.text();

    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);?/);
    if (!match || !match[1]) return [];

    const data = JSON.parse(match[1]);

    // Normaliza colunas removendo acentos e espaços para virar keys fáceis
    const normalizeKey = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
        .trim()
        .replace(/\s+/g, '_') // espaços por underscore
        .replace(/[^a-z0-9_]/g, ''); // remove tudo que não for alfanumérico ou underscore
    };

    const cols = data.table.cols.map(col => col.label ? normalizeKey(col.label) : '');

    const rows = data.table.rows.map(row => {
      const rowData = {};
      row.c.forEach((cell, i) => {
        if (cols[i]) {
          rowData[cols[i]] = cell ? cell.v : null;
        }
      });
      // Normalize key-matching fields to strings to avoid type mismatches
      // (gviz may return numeric columns like secundagem as JS numbers)
      const KEY_FIELDS = ['programa', 'praca', 'secundagem'];
      KEY_FIELDS.forEach(k => {
        if (rowData[k] !== null && rowData[k] !== undefined) {
          rowData[k] = String(rowData[k]);
        }
      });
      return rowData;
    });

    return rows;
  } catch (error) {
    console.error(`Erro ao buscar aba ${sheetName}:`, error);
    return [];
  }
};

export const fetchAllSheetData = async () => {
  try {
    const [programas, valores, patrocinios] = await Promise.all([
      fetchSheetTab('programas'),
      fetchSheetTab('valores'),
      fetchSheetTab('patrocínios')
    ]);

    return {
      programas,
      valores,
      patrocinios
    };
  } catch (error) {
    console.error("Erro fatal ao fazer fetch das abas:", error);
    return { programas: [], valores: [], patrocinios: [] };
  }
};
