/**
 * Serviço de dados — 2 abas: programas + patrocinios
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

    // Normaliza colunas: lowercase, sem acentos, underscores
    const normalizeKey = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    };

    const cols = data.table.cols.map(col => col.label ? normalizeKey(col.label) : '');

    const rows = data.table.rows.map(row => {
      const rowData = {};
      row.c.forEach((cell, i) => {
        if (cols[i]) {
          let val = cell ? cell.v : null;
          // gviz retorna colunas de hora como string "Date(ano,mes,dia,HH,MM,SS)"
          if (typeof val === 'string' && val.startsWith('Date(')) {
            const parts = val.replace('Date(', '').replace(')', '').split(',').map(Number);
            // parts: [year, month, day, hours, minutes, seconds]
            val = `${String(parts[3]).padStart(2, '0')}:${String(parts[4]).padStart(2, '0')}`;
          } else if (val instanceof Date) {
            val = `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
          }
          rowData[cols[i]] = val;
        }
      });
      // Normaliza campos-chave para string e remove espaços extras
      const KEY_FIELDS = ['programa', 'secundagem'];
      KEY_FIELDS.forEach(k => {
        if (rowData[k] !== null && rowData[k] !== undefined) {
          rowData[k] = String(rowData[k]).trim();
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
    const [programas, patrocinios, valores] = await Promise.all([
      fetchSheetTab('programas'),
      fetchSheetTab('patrocinios'),
      fetchSheetTab('valores')
    ]);

    // Merge 'valores' into 'programas' matching by 'programa'
    const mergedProgramas = programas.map(prog => {
      if (!prog.programa) return prog;
      const valMatch = valores.find(v => v.programa === prog.programa);
      if (valMatch) {
        return { ...prog, ...valMatch };
      }
      return prog;
    });

    return { programas: mergedProgramas, patrocinios };
  } catch (error) {
    console.error("Erro fatal ao fazer fetch das abas:", error);
    return { programas: [], patrocinios: [] };
  }
};
