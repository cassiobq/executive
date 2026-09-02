import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    colLetter,
    escapeXml,
    dateToExcelSerial,
    setCellText,
    setCellNumber,
    forceFullRecalc,
    fillPiSheet,
} from './piXlsx.js';

test('colLetter — colunas usadas pela grade de dias', () => {
    assert.equal(colLetter(1), 'A');
    assert.equal(colLetter(8), 'H');   // dia 1
    assert.equal(colLetter(26), 'Z');
    assert.equal(colLetter(27), 'AA');
    assert.equal(colLetter(38), 'AL'); // dia 31
    assert.equal(colLetter(53), 'BA'); // coluna dos totais
});

test('escapeXml — protege os caracteres que quebrariam o XML', () => {
    assert.equal(escapeXml('Casas & Cia'), 'Casas &amp; Cia');
    assert.equal(escapeXml('a<b>c'), 'a&lt;b&gt;c');
    assert.equal(escapeXml('30"'), '30&quot;');
});

test('dateToExcelSerial — serial de data do Excel', () => {
    // 1900-01-01 é o serial 2 na referência 1899-12-30 usada pelo Excel.
    assert.equal(dateToExcelSerial(new Date(1900, 0, 1)), 2);
    assert.equal(dateToExcelSerial(new Date(2026, 8, 1)), 46266); // 01/09/2026
});

test('setCellText — preenche célula vazia preservando o estilo', () => {
    const xml = '<row r="32"><c r="A32" s="95"/></row>';
    const out = setCellText(xml, 'A32', 'AUTO');
    assert.equal(out, '<row r="32"><c r="A32" s="95" t="inlineStr"><is><t xml:space="preserve">AUTO</t></is></c></row>');
});

test('setCellText — substitui conteúdo antigo e descarta o t="s" anterior', () => {
    const xml = '<c r="A3" s="4" t="s"><v>12</v></c>';
    const out = setCellText(xml, 'A3', 'RIO VERDE');
    assert.equal(out, '<c r="A3" s="4" t="inlineStr"><is><t xml:space="preserve">RIO VERDE</t></is></c>');
});

test('setCellNumber — escreve número mantendo o estilo (formato de moeda vem dele)', () => {
    const xml = '<c r="AZ32" s="108"/>';
    assert.equal(setCellNumber(xml, 'AZ32', 584), '<c r="AZ32" s="108"><v>584</v></c>');
});

test('setCell* — valor vazio limpa a célula em vez de escrever string vazia', () => {
    const xml = '<c r="B17" s="60" t="inlineStr"><is><t>antigo</t></is></c>';
    assert.equal(setCellText(xml, 'B17', ''), '<c r="B17" s="60"/>');
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

test('forceFullRecalc — adiciona fullCalcOnLoad ao calcPr existente', () => {
    const wb = '<workbook><calcPr calcId="191028"/></workbook>';
    assert.equal(forceFullRecalc(wb), '<workbook><calcPr calcId="191028" fullCalcOnLoad="1"/></workbook>');
});

test('forceFullRecalc — cria calcPr quando não existe, e é idempotente', () => {
    assert.equal(
        forceFullRecalc('<workbook></workbook>'),
        '<workbook><calcPr fullCalcOnLoad="1"/></workbook>',
    );
    const already = '<workbook><calcPr calcId="1" fullCalcOnLoad="1"/></workbook>';
    assert.equal(forceFullRecalc(already), already);
});

test('fillPiSheet — escreve praça, título, linha de programa e marcas nos lugares certos', () => {
    const xml = [
        '<c r="A3" s="4"/>', '<c r="AH4" s="9"/>', '<c r="BA50" s="147"/>',
        '<c r="B16" s="60"/>', '<c r="O16" s="61"/>',
        '<c r="A32" s="95"/>', '<c r="B32" s="96"/>', '<c r="C32" s="97"/>',
        '<c r="F32" s="98"/>', '<c r="AY32" s="107"/>', '<c r="AZ32" s="108"/>',
        '<c r="M32" s="100"/>',
    ].join('');

    const out = fillPiSheet(xml, {
        pracaLabel: 'RIO VERDE',
        mesVeiculacao: new Date(2026, 8, 1),
        titulosUsados: [{ letra: 'A', nome: 'Campanha' }],
        duracaoLabel: '30"',
        descontoPercent: 10,
        rows: [{ sigla: 'AUTO', programa: 'AUTO ESPORTE', dias: 'Dom', unit: 584, marks: { 6: 'A' } }],
    });

    assert.match(out, /<c r="A3" s="4" t="inlineStr"><is><t xml:space="preserve">RIO VERDE<\/t><\/is><\/c>/);
    assert.match(out, /<c r="AH4" s="9"><v>46266<\/v><\/c>/);
    assert.match(out, /<c r="BA50" s="147"><v>0\.1<\/v><\/c>/);
    assert.match(out, /<c r="B16" s="60" t="inlineStr"><is><t xml:space="preserve">Campanha<\/t><\/is><\/c>/);
    assert.match(out, /<c r="O16" s="61" t="inlineStr"><is><t xml:space="preserve">30&quot;<\/t><\/is><\/c>/);
    assert.match(out, /<c r="A32" s="95" t="inlineStr"><is><t xml:space="preserve">AUTO<\/t><\/is><\/c>/);
    assert.match(out, /<c r="F32" s="98"><v>0\.1<\/v><\/c>/);
    assert.match(out, /<c r="AZ32" s="108"><v>584<\/v><\/c>/);
    // dia 6 -> coluna M (6 + 7 = 13)
    assert.match(out, /<c r="M32" s="100" t="inlineStr"><is><t xml:space="preserve">A<\/t><\/is><\/c>/);
});

test('fillPiSheet — respeita o limite de 16 linhas do formulário', () => {
    const cells = [];
    for (let r = 32; r <= 48; r++) cells.push(`<c r="A${r}" s="95"/>`);
    const xml = cells.join('');
    const rows = Array.from({ length: 17 }, (_, i) => ({
        sigla: `S${i}`, programa: 'P', dias: 'Dom', unit: 1, marks: {},
    }));

    const out = fillPiSheet(xml, {
        pracaLabel: 'X', mesVeiculacao: null, titulosUsados: [],
        duracaoLabel: '30"', descontoPercent: 0, rows,
    });

    assert.match(out, /<c r="A47" s="95" t="inlineStr">/); // 16ª linha preenchida
    assert.match(out, /<c r="A48" s="95"\/>/);             // a 17ª não invade a linha seguinte
});
