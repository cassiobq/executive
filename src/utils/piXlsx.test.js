import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    colLetter,
    escapeXml,
    setCellText,
    setCellNumber,
    fillPiSheet,
    forceFullCalc,
    dateToExcelSerial,
    MES_VEICULACAO_CELL,
    DESCONTO_GLOBAL_CELL,
    CLIENTE_CELLS,
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

test('forceFullCalc — marca o recálculo preservando o calcId do template', () => {
    const xml = '<workbook><sheets/><calcPr calcId="191028"/></workbook>';
    assert.equal(
        forceFullCalc(xml),
        '<workbook><sheets/><calcPr calcId="191028" fullCalcOnLoad="1"/></workbook>',
    );
});

test('forceFullCalc — é idempotente', () => {
    const xml = '<workbook><calcPr calcId="191028" fullCalcOnLoad="1"/></workbook>';
    assert.equal(forceFullCalc(xml), xml);
});

test('forceFullCalc — cobre calcPr com filhos e workbook sem calcPr', () => {
    assert.equal(
        forceFullCalc('<workbook><calcPr calcId="5"><x/></calcPr></workbook>'),
        '<workbook><calcPr calcId="5" fullCalcOnLoad="1"><x/></calcPr></workbook>',
    );
    assert.equal(
        forceFullCalc('<workbook><sheets/></workbook>'),
        '<workbook><sheets/><calcPr fullCalcOnLoad="1"/></workbook>',
    );
});

test('forceFullCalc — não é o caminho pra mexer em fórmula: só toca no calcPr', () => {
    const xml = '<workbook><definedNames><definedName name="a">SUM(A1)</definedName></definedNames><calcPr calcId="1"/></workbook>';
    const out = forceFullCalc(xml);
    assert.equal(out.replace(' fullCalcOnLoad="1"', ''), xml);
});

test('dateToExcelSerial — dia 1 de janeiro/2026 é o serial 46023 (default do próprio template)', () => {
    assert.equal(dateToExcelSerial(new Date(2026, 0, 1)), 46023);
});

test('dateToExcelSerial — dia 1 de setembro/2026', () => {
    // conferido de forma independente (dias desde 1899-12-30)
    assert.equal(dateToExcelSerial(new Date(2026, 8, 1)), 46266);
});

test('fillPiSheet — mês de veiculação, desconto global e bloco de títulos', () => {
    const cells = [`<c r="${MES_VEICULACAO_CELL}" s="185"/>`, `<c r="${DESCONTO_GLOBAL_CELL}" s="56"/>`];
    for (let r = 16; r <= 21; r++) {
        cells.push(`<c r="B${r}" s="165"/>`, `<c r="O${r}" s="78"/>`);
    }
    const xml = fillPiSheet(cells.join(''), {
        descontoPercent: 20,
        duracaoLabel: '30"',
        duracaoSegundos: 30,
        mesVeiculacao: new Date(2026, 8, 1),
        titulosUsados: [{ letra: 'A', nome: 'Campanha Setembro' }, { letra: 'C', nome: null }],
        rows: [],
    });

    assert.match(xml, new RegExp(`<c r="${MES_VEICULACAO_CELL}" s="185"><v>46266</v></c>`));
    assert.match(xml, new RegExp(`<c r="${DESCONTO_GLOBAL_CELL}" s="56"><v>0\\.2</v></c>`));

    // A (usado, com nome) -> linha 16
    assert.match(xml, /<c r="B16" s="165" t="inlineStr"><is><t xml:space="preserve">Campanha Setembro<\/t><\/is><\/c>/);
    assert.match(xml, /<c r="O16" s="78"><v>30<\/v><\/c>/);
    // B (não usado) -> linha 17, continua vazia
    assert.match(xml, /<c r="B17" s="165"\/>/);
    assert.match(xml, /<c r="O17" s="78"\/>/);
    // C (usado, sem nome cadastrado) -> linha 18, cai pra letra
    assert.match(xml, /<c r="B18" s="165" t="inlineStr"><is><t xml:space="preserve">C<\/t><\/is><\/c>/);
    assert.match(xml, /<c r="O18" s="78"><v>30<\/v><\/c>/);
});

test('fillPiSheet — sem desconto, BA50 fica vazia (BA51 trata blank como 0)', () => {
    const xml = fillPiSheet(`<c r="${DESCONTO_GLOBAL_CELL}" s="56"/>`, {
        descontoPercent: 0, duracaoLabel: '30"', rows: [],
    });
    assert.match(xml, new RegExp(`<c r="${DESCONTO_GLOBAL_CELL}" s="56"/>`));
});

test('fillPiSheet — sem mesVeiculacao, AH4 não é tocada', () => {
    const xml = fillPiSheet(`<c r="${MES_VEICULACAO_CELL}" s="185"/>`, {
        descontoPercent: 0, duracaoLabel: '30"', rows: [],
    });
    assert.match(xml, new RegExp(`<c r="${MES_VEICULACAO_CELL}" s="185"/>`));
});

test('fillPiSheet — dados de cliente, só quando informados', () => {
    const cells = Object.values(CLIENTE_CELLS).map(ref => `<c r="${ref}" s="99"/>`).join('');
    const cliente = {
        nome: 'ACME LTDA', nomeFantasia: 'Acme', endereco: 'Av. Brasil, 100',
        bairro: 'Centro', cidade: 'Rio Verde', uf: 'GO', cep: '75901-000',
        fone: '(64) 3322-1100', cgc: '12.345.678/0001-90',
    };
    const out = fillPiSheet(cells, { descontoPercent: 0, duracaoLabel: '30"', rows: [], cliente });
    for (const [field, ref] of Object.entries(CLIENTE_CELLS)) {
        assert.match(out, new RegExp(`<c r="${ref}" s="99" t="inlineStr"><is><t xml:space="preserve">${cliente[field].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</t></is></c>`));
    }

    const semCliente = fillPiSheet(cells, { descontoPercent: 0, duracaoLabel: '30"', rows: [] });
    assert.equal(semCliente, cells); // cliente ausente: nenhuma das 9 células é tocada
});

test('fillPiSheet — não vaza pras células de fórmula vizinhas do bloco de títulos/cliente/mês', () => {
    const xml = [
        `<c r="${MES_VEICULACAO_CELL}" s="185"/>`,
        `<c r="${DESCONTO_GLOBAL_CELL}" s="56"/>`,
        '<c r="B16" s="165"/><c r="O16" s="78"/>',
        '<c r="A7" s="186"/>',
        '<c r="BA48" s="144"><f>SUM(BA32:BA47)</f><v>0</v></c>',
        '<c r="BA51" s="50"><f>(BA48-(BA48*BA50))</f><v>0</v></c>',
        '<c r="BA4" s="70"><f ca="1">NOW()</f><v>46204.716807638892</v></c>',
    ].join('');
    const out = fillPiSheet(xml, {
        descontoPercent: 10, duracaoLabel: '30"', duracaoSegundos: 30,
        mesVeiculacao: new Date(2026, 8, 1),
        titulosUsados: [{ letra: 'A', nome: 'X' }],
        cliente: { nome: 'ACME' },
        rows: [],
    });
    assert.match(out, /<c r="BA48" s="144"><f>SUM\(BA32:BA47\)<\/f><v>0<\/v><\/c>/);
    assert.match(out, /<c r="BA51" s="50"><f>\(BA48-\(BA48\*BA50\)\)<\/f><v>0<\/v><\/c>/);
    assert.match(out, /<c r="BA4" s="70"><f ca="1">NOW\(\)<\/f><v>46204\.716807638892<\/v><\/c>/);
});
