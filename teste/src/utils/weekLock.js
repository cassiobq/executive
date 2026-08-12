// Parsing do campo "dias" de programas.json (ex.: "Seg/Sex", "Sáb", "Seg/Dom", "-")
// pra saber em quais dias da semana (índice de Date#getDay(), 0=Dom) um programa pode ir ao ar.
const WEEK_ORDER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const ABBR_TO_DOW = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sáb: 6 };

// Retorna um Set de getDay()-index permitidos, ou null se não há restrição.
export function getAllowedWeekdays(diasField) {
    if (!diasField || diasField === '-') return null;
    const parts = diasField.split('/').map(s => s.trim());
    if (parts.length === 1) {
        const dow = ABBR_TO_DOW[parts[0]];
        return dow === undefined ? null : new Set([dow]);
    }
    const [start, end] = parts;
    const startPos = WEEK_ORDER.indexOf(start);
    const endPos = WEEK_ORDER.indexOf(end);
    if (startPos === -1 || endPos === -1) return null;
    const allowed = new Set();
    for (let i = startPos; i <= endPos; i++) allowed.add(ABBR_TO_DOW[WEEK_ORDER[i]]);
    return allowed;
}

// Extrai a quantidade de uma marca tipo "A"/"2B"/"10C" (prefixo numérico, padrão 1).
export function markQuantity(mark) {
    if (!mark) return 0;
    const match = String(mark).match(/^(\d*)/);
    const n = match && match[1] ? parseInt(match[1], 10) : 1;
    return n || 1;
}
