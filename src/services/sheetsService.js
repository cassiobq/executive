/**
 * Serviço de dados — Lê de arquivos JSON locais e consolida informações.
 * Remove a dependência de requisições HTTP para a API do Google Sheets.
 */

import programasCru from '../data/programas.json';
import patrociniosCru from '../data/patrocinios.json';
import valoresCru from '../data/valores.json';

const normalizeKey = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const normalizeObjectKeys = (obj) => {
  const normalized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      normalized[normalizeKey(key)] = obj[key];
    }
  }
  
  // Normaliza campos chave
  const KEY_FIELDS = ['programa', 'secundagem'];
  KEY_FIELDS.forEach(k => {
    if (normalized[k] !== null && normalized[k] !== undefined) {
      normalized[k] = String(normalized[k]).trim();
    }
  });
  
  return normalized;
};

export const fetchAllSheetData = async () => {
  try {
    const programas = programasCru.map(normalizeObjectKeys);
    const patrocinios = patrociniosCru.map(normalizeObjectKeys);
    const valores = valoresCru.map(normalizeObjectKeys);

    // Mescla 'valores' (preços das praças) em 'programas' batendo pelo nome do programa
    const mergedProgramas = programas.map(prog => {
      if (!prog.programa) return prog;
      
      const valMatch = valores.find(v => {
        const vProg = v.programa || '';
        const pProg = prog.programa || '';
        return vProg.trim().toUpperCase() === pProg.trim().toUpperCase();
      });
      
      if (valMatch) {
        return { ...prog, ...valMatch };
      }
      return prog;
    });

    return { programas: mergedProgramas, patrocinios };
  } catch (error) {
    console.error("Erro fatal ao carregar dados consolidados:", error);
    return { programas: [], patrocinios: [] };
  }
};
