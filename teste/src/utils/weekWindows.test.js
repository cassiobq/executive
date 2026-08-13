import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeekWindows } from './weekWindows.js';

// Agosto/2026: dia 1 = sábado, dia 31 = segunda (31 dias). Semana fragmentada
// no início (sáb+dom) e no fim (só a segunda 31).
test('agosto 2026 — fragmentos no início e no fim do mês', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 7, daysInMonth: 31 });
    assert.equal(weeks.length, 6);
    assert.deepEqual(weeks[0], { days: [1, 2], mondayDay: null });
    assert.deepEqual(weeks[1], { days: [3, 4, 5, 6, 7, 8, 9], mondayDay: 3 });
    assert.deepEqual(weeks[2], { days: [10, 11, 12, 13, 14, 15, 16], mondayDay: 10 });
    assert.deepEqual(weeks[3], { days: [17, 18, 19, 20, 21, 22, 23], mondayDay: 17 });
    assert.deepEqual(weeks[4], { days: [24, 25, 26, 27, 28, 29, 30], mondayDay: 24 });
    assert.deepEqual(weeks[5], { days: [31], mondayDay: 31 });
});

// Novembro/2026: dia 1 = domingo, dia 30 = segunda (30 dias). Primeira semana
// é só o domingo 1; última semana é só a segunda 30.
test('novembro 2026 — mês começa no domingo', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 10, daysInMonth: 30 });
    assert.equal(weeks.length, 6);
    assert.deepEqual(weeks[0], { days: [1], mondayDay: null });
    assert.deepEqual(weeks[1], { days: [2, 3, 4, 5, 6, 7, 8], mondayDay: 2 });
    assert.deepEqual(weeks[5], { days: [30], mondayDay: 30 });
});

// Fevereiro/2027: dia 1 = segunda, dia 28 = domingo (28 dias). Encaixa em
// exatamente 4 semanas cheias, sem fragmento nenhum — caso "redondo".
test('fevereiro 2027 — 4 semanas cheias, sem fragmentos', () => {
    const weeks = computeWeekWindows({ year: 2027, monthIndex: 1, daysInMonth: 28 });
    assert.equal(weeks.length, 4);
    assert.deepEqual(weeks[0], { days: [1, 2, 3, 4, 5, 6, 7], mondayDay: 1 });
    assert.deepEqual(weeks[3], { days: [22, 23, 24, 25, 26, 27, 28], mondayDay: 22 });
});

test('toda semana (exceto possivelmente a 1ª) começa numa segunda-feira real', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 7, daysInMonth: 31 });
    for (let i = 1; i < weeks.length; i++) {
        const firstDay = weeks[i].days[0];
        const dow = new Date(2026, 7, firstDay).getDay();
        assert.equal(dow, 1, `semana ${i} deveria começar numa segunda`);
    }
});
