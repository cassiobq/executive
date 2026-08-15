// Letras de título permitidas numa PI, na ordem fixa em que são atribuídas
// (a próxima "adicionar título" é sempre a seguinte nessa lista).
export const LETRAS_TITULO = ['A', 'B', 'C', 'D', 'E', 'F'];

// Próxima letra disponível pra um novo título, ou null quando os 6 já existem.
export function getNextTituloLetter(titulos) {
    if (titulos.length >= LETRAS_TITULO.length) return null;
    return LETRAS_TITULO[titulos.length];
}

// Títulos com pelo menos 1 marcação em algum lugar do mapa (todas as linhas,
// não só a semana visível) — usado pra montar a legenda exportada, que não
// deve listar título criado e nunca usado. Uma letra marcada sem título
// correspondente (ex.: mapa editado pelo desktop com uma letra livre) ainda
// aparece, só sem nome — por isso a varredura é por letra usada, não pelos
// títulos cadastrados.
export function computeTitulosUsados(titulos, mapRows) {
    const letrasUsadas = new Set();
    for (const row of mapRows) {
        for (const mark of Object.values(row.marks || {})) {
            const match = String(mark).match(/[A-Z]$/);
            if (match) letrasUsadas.add(match[0]);
        }
    }
    return LETRAS_TITULO
        .filter(letra => letrasUsadas.has(letra))
        .map(letra => titulos.find(t => t.letra === letra) || { letra, nome: null });
}
