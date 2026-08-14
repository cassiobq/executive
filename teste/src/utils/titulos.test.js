import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextTituloLetter, computeTitulosUsados, LETRAS_TITULO } from './titulos.js';

test('getNextTituloLetter: com 1 título (A), a próxima é B', () => {
    assert.equal(getNextTituloLetter([{ letra: 'A', nome: 'Campanha' }]), 'B');
});

test('getNextTituloLetter: com 5 títulos, a próxima é F (a última permitida)', () => {
    const titulos = ['A', 'B', 'C', 'D', 'E'].map(letra => ({ letra, nome: '' }));
    assert.equal(getNextTituloLetter(titulos), 'F');
});

test('getNextTituloLetter: com os 6 títulos (A-F), não há mais próxima', () => {
    const titulos = LETRAS_TITULO.map(letra => ({ letra, nome: '' }));
    assert.equal(getNextTituloLetter(titulos), null);
});

test('computeTitulosUsados: título usado em pelo menos 1 marca aparece na legenda', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 3: 'A', 5: '2A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'A', nome: 'Campanha' }]);
});

test('computeTitulosUsados: título criado mas nunca usado não aparece', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }, { letra: 'B', nome: 'Institucional' }];
    const mapRows = [{ marks: { 3: 'A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'A', nome: 'Campanha' }]);
});

test('computeTitulosUsados: varre todas as linhas do mapa, não só a primeira', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }, { letra: 'B', nome: 'Institucional' }];
    const mapRows = [{ marks: { 3: 'A' } }, { marks: { 10: '3B' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [
        { letra: 'A', nome: 'Campanha' },
        { letra: 'B', nome: 'Institucional' },
    ]);
});

test('computeTitulosUsados: letra usada sem título correspondente aparece só com a letra', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 3: '2C' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'C', nome: null }]);
});

test('computeTitulosUsados: resultado sempre em ordem A→F, independente da ordem em titulos', () => {
    const titulos = [{ letra: 'C', nome: 'Aniversário' }, { letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 1: 'C' } }, { marks: { 2: 'A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [
        { letra: 'A', nome: 'Campanha' },
        { letra: 'C', nome: 'Aniversário' },
    ]);
});

test('computeTitulosUsados: sem marcações, legenda vazia', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    assert.deepEqual(computeTitulosUsados(titulos, []), []);
});
