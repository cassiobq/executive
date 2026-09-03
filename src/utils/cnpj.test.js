import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
    onlyDigits,
    isValidCnpjLength,
    maskCnpjInput,
    formatCnpj,
    formatCep,
    formatTelefone,
    mapCnpjResponseToCliente,
    fetchCnpjData,
} from './cnpj.js';

test('onlyDigits — remove tudo que não é número', () => {
    assert.equal(onlyDigits('12.345.678/0001-90'), '12345678000190');
    assert.equal(onlyDigits(''), '');
    assert.equal(onlyDigits(null), '');
});

test('isValidCnpjLength — exige exatamente 14 dígitos', () => {
    assert.equal(isValidCnpjLength('12.345.678/0001-90'), true);
    assert.equal(isValidCnpjLength('123'), false);
    assert.equal(isValidCnpjLength(''), false);
});

test('maskCnpjInput — aplica a máscara progressivamente enquanto digita', () => {
    assert.equal(maskCnpjInput('12'), '12');
    assert.equal(maskCnpjInput('12345'), '12.345');
    assert.equal(maskCnpjInput('12345678'), '12.345.678');
    assert.equal(maskCnpjInput('123456780001'), '12.345.678/0001');
    assert.equal(maskCnpjInput('12345678000190'), '12.345.678/0001-90');
    assert.equal(maskCnpjInput('12345678000190999'), '12.345.678/0001-90'); // ignora excedente
});

test('formatCnpj — só formata quando tem os 14 dígitos completos', () => {
    assert.equal(formatCnpj('12345678000190'), '12.345.678/0001-90');
    assert.equal(formatCnpj('123'), '123'); // incompleto: devolve como está
});

test('formatCep — hífen só depois do 5º dígito', () => {
    assert.equal(formatCep('75901000'), '75901-000');
    assert.equal(formatCep('759'), '759');
});

test('formatTelefone — 10 dígitos (fixo) e 11 (celular com 9º dígito)', () => {
    assert.equal(formatTelefone('6433221100'), '(64) 3322-1100');
    assert.equal(formatTelefone('64993221100'), '(64) 99322-1100');
    assert.equal(formatTelefone(''), '');
});

test('mapCnpjResponseToCliente — traduz a resposta da BrasilAPI pros campos da PI', () => {
    const cliente = mapCnpjResponseToCliente({
        cnpj: '12345678000190',
        razao_social: 'ACME COMERCIO LTDA',
        nome_fantasia: 'Acme',
        descricao_tipo_de_logradouro: 'Avenida',
        logradouro: 'Brasil',
        numero: '100',
        complemento: 'Sala 2',
        bairro: 'Centro',
        municipio: 'Rio Verde',
        uf: 'GO',
        cep: '75901000',
        ddd_telefone_1: '6433221100',
    });
    assert.deepEqual(cliente, {
        nome: 'ACME COMERCIO LTDA',
        nomeFantasia: 'Acme',
        endereco: 'Avenida Brasil, 100 - Sala 2',
        bairro: 'Centro',
        cidade: 'Rio Verde',
        uf: 'GO',
        cep: '75901-000',
        fone: '(64) 3322-1100',
        cgc: '12.345.678/0001-90',
    });
});

test('mapCnpjResponseToCliente — sem nome fantasia, cai pra razão social', () => {
    const cliente = mapCnpjResponseToCliente({ cnpj: '12345678000190', razao_social: 'ACME LTDA' });
    assert.equal(cliente.nomeFantasia, 'ACME LTDA');
});

test('mapCnpjResponseToCliente — null direto vira null', () => {
    assert.equal(mapCnpjResponseToCliente(null), null);
});

test('fetchCnpjData — rejeita antes de chamar a rede se o CNPJ é curto', async () => {
    await assert.rejects(() => fetchCnpjData('123'), /14 dígitos/);
});

test('fetchCnpjData — 404 vira "não encontrado"', async (t) => {
    const original = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({ status: 404, ok: false }));
    t.after(() => { globalThis.fetch = original; });
    await assert.rejects(() => fetchCnpjData('12345678000190'), /não encontrado/i);
});

test('fetchCnpjData — outro erro HTTP vira mensagem genérica', async (t) => {
    const original = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({ status: 500, ok: false }));
    t.after(() => { globalThis.fetch = original; });
    await assert.rejects(() => fetchCnpjData('12345678000190'), /não foi possível/i);
});

test('fetchCnpjData — sucesso devolve o cliente já mapeado', async (t) => {
    const original = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
        status: 200,
        ok: true,
        json: async () => ({ cnpj: '12345678000190', razao_social: 'ACME LTDA' }),
    }));
    t.after(() => { globalThis.fetch = original; });
    const cliente = await fetchCnpjData('12.345.678/0001-90');
    assert.equal(cliente.nome, 'ACME LTDA');
    assert.equal(cliente.cgc, '12.345.678/0001-90');
});

test('fetchCnpjData — falha de rede vira mensagem de conexão', async (t) => {
    const original = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => { throw new Error('network fail'); });
    t.after(() => { globalThis.fetch = original; });
    await assert.rejects(() => fetchCnpjData('12345678000190'), /conexão/i);
});
