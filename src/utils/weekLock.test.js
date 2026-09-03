import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMark, expandDiasField } from './weekLock.js';

test('normalizeMark: letra minúscula vira maiúscula', () => {
    assert.equal(normalizeMark('a'), 'A');
});

test('normalizeMark: número seguido de letra é preservado', () => {
    assert.equal(normalizeMark('2b'), '2B');
});

test('normalizeMark: caracteres inválidos são removidos', () => {
    assert.equal(normalizeMark('2-b!'), '2B');
});

test('normalizeMark: só aceita 1 letra após os dígitos', () => {
    assert.equal(normalizeMark('2bc'), '2B');
});

test('normalizeMark: string vazia continua vazia', () => {
    assert.equal(normalizeMark(''), '');
});

test('expandDiasField: intervalo Seg/Sex vira todos os dias úteis', () => {
    assert.equal(expandDiasField('Seg/Sex'), 'Seg/Ter/Qua/Qui/Sex');
});

test('expandDiasField: intervalo Seg/Sáb inclui o sábado', () => {
    assert.equal(expandDiasField('Seg/Sáb'), 'Seg/Ter/Qua/Qui/Sex/Sáb');
});

test('expandDiasField: intervalo Seg/Dom cobre a semana inteira', () => {
    assert.equal(expandDiasField('Seg/Dom'), 'Seg/Ter/Qua/Qui/Sex/Sáb/Dom');
});

test('expandDiasField: um único dia não muda', () => {
    assert.equal(expandDiasField('Sáb'), 'Sáb');
    assert.equal(expandDiasField('Dom'), 'Dom');
});

test('expandDiasField: campo sem restrição ("-") passa direto', () => {
    assert.equal(expandDiasField('-'), '-');
});

test('expandDiasField: vazio vira string vazia', () => {
    assert.equal(expandDiasField(''), '');
    assert.equal(expandDiasField(undefined), '');
});
