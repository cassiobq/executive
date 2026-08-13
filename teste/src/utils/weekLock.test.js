import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMark } from './weekLock.js';

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
