// Particiona os dias de um mês em janelas de semana ancoradas na segunda-feira
// (Seg-Dom), preservando fragmentos no início/fim do mês (ex.: mês que começa
// numa quinta tem uma 1ª "semana" com só quinta/sexta/sábado/domingo).
// `mondayDay` é o dia-do-mês da segunda-feira daquela janela, ou null quando a
// janela não contém uma segunda dentro do mês (só pode acontecer na 1ª janela).
export function computeWeekWindows({ year, monthIndex, daysInMonth }) {
    const weeks = [];
    let day = 1;
    while (day <= daysInMonth) {
        const dow = new Date(year, monthIndex, day).getDay(); // 0=Dom..6=Sáb
        const isoDow = dow === 0 ? 7 : dow; // 1=Seg..7=Dom
        const daysUntilSunday = 7 - isoDow;
        const weekEnd = Math.min(day + daysUntilSunday, daysInMonth);

        const days = [];
        for (let d = day; d <= weekEnd; d++) days.push(d);

        weeks.push({ days, mondayDay: isoDow === 1 ? day : null });
        day = weekEnd + 1;
    }
    return weeks;
}

// Deriva o índice da semana "ativa" a partir da posição de scroll de um
// carrossel horizontal com scroll-snap (um painel por semana, cada um com a
// largura do container). Usado pelo editor mobile depois que o usuário
// arrasta com o dedo em vez de clicar nas setas.
export function computeActiveWeekIndex(scrollLeft, panelWidth, weekCount) {
    if (weekCount <= 0 || !panelWidth) return 0;
    const idx = Math.round(scrollLeft / panelWidth);
    return Math.min(weekCount - 1, Math.max(0, idx));
}
