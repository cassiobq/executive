import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    colLetter,
    escapeXml,
    setCellText,
    setCellNumber,
    fillPiSheet,
} from './piXlsx.js';

test('colLetter — colunas usadas pela grade de dias', () => {
    assert.equal(colLetter(1), 'A');
    assert.equal(colLetter(8), 'H');   // dia 1
    assert.equal(colLetter(26), 'Z');
    assert.equal(colLetter(27), 'AA');
    assert.equal(colLetter(38), 'AL'); // dia 31
});

test('escapeXml — protege os caracteres que quebrariam o XML', () => {
    assert.equal(escapeXml('Casas & Cia'), 'Casas &amp; Cia');
    assert.equal(escapeXml('a<b>c'), 'a&lt;b&gt;c');
    assert.equal(escapeXml('30"'), '30&quot;');
});

test('setCellText — preenche célula vazia preservando o estilo', () => {
    const xml = '<row r="32"><c r="A32" s="95"/></row>';
    const out = setCellText(xml, 'A32', 'AUTO');
    assert.equal(out, '<row r="32"><c r="A32" s="95" t="inlineStr"><is><t xml:space="preserve">AUTO</t></is></c></row>');
});

test('setCellText — substitui conteúdo antigo e descarta o t="s" anterior', () => {
    const xml = '<c r="A32" s="4" t="s"><v>12</v></c>';
    const out = setCellText(xml, 'A32', 'BIGB');
    assert.equal(out, '<c r="A32" s="4" t="inlineStr"><is><t xml:space="preserve">BIGB</t></is></c>');
});

test('setCellNumber — escreve número mantendo o estilo (formato vem dele)', () => {
    const xml = '<c r="F32" s="92"/>';
    assert.equal(setCellNumber(xml, 'F32', 0.1), '<c r="F32" s="92"><v>0.1</v></c>');
});

test('setCell* — valor vazio limpa a célula em vez de escrever string vazia', () => {
    const xml = '<c r="B33" s="60" t="inlineStr"><is><t>antigo</t></is></c>';
    assert.equal(setCellText(xml, 'B33', ''), '<c r="B33" s="60"/>');
});

test('setCell* — célula ausente no template deixa o XML intacto', () => {
    const xml = '<c r="A32" s="95"/>';
    assert.equal(setCellText(xml, 'ZZ99', 'x'), xml);
});

test('setCell* — não vaza pra célula vizinha de nome parecido', () => {
    const xml = '<c r="A3" s="4"/><c r="A32" s="95"/>';
    const out = setCellText(xml, 'A3', 'X');
    assert.match(out, /<c r="A32" s="95"\/>/); // A32 continua intacta
    assert.match(out, /<c r="A3" s="4" t="inlineStr">/);
});

test('fillPiSheet — escreve só as células de entrada da grade', () => {
    const xml = [
        '<c r="A3" s="4"/>', '<c r="AH4" s="9"/>', '<c r="B16" s="60"/>',
        '<c r="A32" s="95"/>', '<c r="B32" s="96"/>', '<c r="C32" s="97"/>',
        '<c r="F32" s="98"/>', '<c r="AY32" s="107"/>', '<c r="AZ32" s="108"/>',
        '<c r="M32" s="100"/>',
        '<c r="AX32" s="120" cm="1"><f t="array" ref="AX32">SUM(_xlfn.MAP(H32:AL32))</f><v>0</v></c>',
        '<c r="BA32" s="119"><f>(AZ32*AX32)</f><v>0</v></c>',
    ].join('');

    const out = fillPiSheet(xml, {
        descontoPercent: 10,
        duracaoLabel: '30"',
        rows: [{ sigla: 'AUTO', programa: 'AUTO ESPORTE', dias: 'Dom', unit: 584, marks: { 6: 'A' } }],
    });

    assert.match(out, /<c r="A32" s="95" t="inlineStr"><is><t xml:space="preserve">AUTO<\/t><\/is><\/c>/);
    assert.match(out, /<c r="B32" s="96" t="inlineStr"><is><t xml:space="preserve">AUTO ESPORTE<\/t><\/is><\/c>/);
    assert.match(out, /<c r="C32" s="97" t="inlineStr"><is><t xml:space="preserve">Dom<\/t><\/is><\/c>/);
    assert.match(out, /<c r="F32" s="98"><v>0\.1<\/v><\/c>/);
    // dia 6 -> coluna M (6 + 7 = 13)
    assert.match(out, /<c r="M32" s="100" t="inlineStr"><is><t xml:space="preserve">A<\/t><\/is><\/c>/);

    assert.match(out, /<c r="AY32" s="107" t="inlineStr"><is><t xml:space="preserve">30&quot;<\/t><\/is><\/c>/);
    assert.match(out, /<c r="AZ32" s="108"><v>584<\/v><\/c>/);

    // fora da grade nada é tocado — a planilha cuida do resto
    assert.match(out, /<c r="A3" s="4"\/>/);
    assert.match(out, /<c r="AH4" s="9"\/>/);
    assert.match(out, /<c r="B16" s="60"\/>/);

    // e nenhuma célula de fórmula é alterada, nem seu valor em cache
    assert.match(out, /<c r="AX32" s="120" cm="1"><f t="array" ref="AX32">SUM\(_xlfn\.MAP\(H32:AL32\)\)<\/f><v>0<\/v><\/c>/);
    assert.match(out, /<c r="BA32" s="119"><f>\(AZ32\*AX32\)<\/f><v>0<\/v><\/c>/);
});

test('fillPiSheet — sem desconto, deixa a coluna DESC.% vazia', () => {
    const xml = '<c r="A32" s="95"/><c r="F32" s="98"/>';
    const out = fillPiSheet(xml, {
        descontoPercent: 0,
        duracaoLabel: '30"',
        rows: [{ sigla: 'AUTO', programa: 'P', dias: 'Dom', marks: {} }],
    });
    assert.match(out, /<c r="F32" s="98"\/>/);
});

test('fillPiSheet — respeita o limite de 16 linhas do formulário', () => {
    const cells = [];
    for (let r = 32; r <= 48; r++) cells.push(`<c r="A${r}" s="95"/>`);
    const rows = Array.from({ length: 17 }, (_, i) => ({
        sigla: `S${i}`, programa: 'P', dias: 'Dom', marks: {},
    }));

    const out = fillPiSheet(cells.join(''), { descontoPercent: 0, duracaoLabel: '30"', rows });

    assert.match(out, /<c r="A47" s="95" t="inlineStr">/); // 16ª linha preenchida
    assert.match(out, /<c r="A48" s="95"\/>/);             // a 17ª não invade a linha seguinte
});
