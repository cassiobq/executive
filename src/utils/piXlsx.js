// Preenche a PI (Pedido de Inserção) escrevendo direto no XML de dentro do
// .xlsx original, em vez de carregar/reserializar a planilha com uma
// biblioteca de spreadsheet.
//
// Por quê: um round-trip por biblioteca (exceljs) reescreve o arquivo inteiro
// e, na prática, perde pedaços — na nossa medição ele descartou
// `showZeros="0"` da aba (fazendo as linhas vazias mostrarem "0"),
// `xl/metadata.xml` (a que o atributo `cm="1"` da fórmula dinâmica
// MAP/LAMBDA se refere), `xl/printerSettings` e alterou o `pageSetup`.
// Cada perda dessas afasta o resultado do documento real. Aqui só trocamos o
// conteúdo de células que já existem no template: todo o resto do arquivo
// (estilos, logo, formas, impressão, fórmulas) continua byte a byte igual.

// Caminhos dentro do .xlsx. Confirmados no workbook.xml do
// Modelo_de_PI_Limpo.xlsx: a aba "Patrocínios_" (sheetId 76) aponta pra
// rId1 -> worksheets/sheet1.xml. O template é um asset fixo nosso, versionado
// junto do código, então esse caminho não muda sem a gente saber.
export const PI_SHEET_PATH = 'xl/worksheets/sheet1.xml';
export const PI_WORKBOOK_PATH = 'xl/workbook.xml';

// Linha da tabela de títulos pra cada letra (A=16 ... F=21). G=22 existe no
// formulário mas nunca é usado por nós — LETRAS_TITULO (utils/titulos.js)
// para em F.
export const TITULO_ROW = { A: 16, B: 17, C: 18, D: 19, E: 20, F: 21 };
// Primeira linha de programa na grade de dias; as seguintes são 33, 34...
export const PROGRAMA_FIRST_ROW = 32;
// Última linha de programa que o formulário comporta.
export const PROGRAMA_LAST_ROW = 47;
// Dia 1 do mês fica na coluna H (8ª); dia 31 cai em AL (38ª).
export const DAY_COL_OFFSET = 7;

// 1 -> 'A', 8 -> 'H', 38 -> 'AL'
export function colLetter(n) {
    let out = '';
    let rest = n;
    while (rest > 0) {
        const mod = (rest - 1) % 26;
        out = String.fromCharCode(65 + mod) + out;
        rest = Math.floor((rest - mod) / 26);
    }
    return out;
}

export function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Serial de data do Excel: dias desde 1899-12-30 (a referência que já embute
// o bug histórico do ano 1900). Usa UTC dos dois lados pra não escorregar um
// dia por causa de fuso/horário de verão.
export function dateToExcelSerial(date) {
    const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const epoch = Date.UTC(1899, 11, 30);
    return Math.round((utc - epoch) / 86400000);
}

// Casa uma célula que já existe no XML, tanto na forma vazia (`<c r="H32"
// s="100"/>`) quanto preenchida (`<c r="A3" s="4" t="s"><v>12</v></c>`).
const cellPattern = (ref) =>
    new RegExp(`<c r="${ref}"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*(?:/>|>[\\s\\S]*?</c>)`);

// Reescreve o conteúdo de uma célula preservando o atributo `s` (o índice de
// estilo — é ele que carrega fonte, cor, borda e formato de número vindos do
// template; perdê-lo desmontaria o visual da célula). Devolve o XML
// inalterado se a célula não existir: todas as que preenchemos já existem no
// modelo (verificado), então "não existe" significa template trocado, e nesse
// caso é melhor não escrever nada do que injetar uma célula sem estilo.
function writeCell(xml, ref, inner, extraAttr = '') {
    return xml.replace(cellPattern(ref), (match, attrs) => {
        const style = /\ss="[^"]*"/.exec(attrs);
        const styleAttr = style ? style[0] : '';
        if (inner === null) return `<c r="${ref}"${styleAttr}/>`;
        return `<c r="${ref}"${styleAttr}${extraAttr}>${inner}</c>`;
    });
}

// Texto vai como inline string: evita mexer em xl/sharedStrings.xml (que é
// compartilhado com as outras abas do arquivo).
export function setCellText(xml, ref, value) {
    if (value === undefined || value === null || value === '') return writeCell(xml, ref, null);
    return writeCell(xml, ref, `<is><t xml:space="preserve">${escapeXml(value)}</t></is>`, ' t="inlineStr"');
}

export function setCellNumber(xml, ref, value) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
        return writeCell(xml, ref, null);
    }
    return writeCell(xml, ref, `<v>${Number(value)}</v>`);
}

export function setCellDate(xml, ref, date) {
    return setCellNumber(xml, ref, dateToExcelSerial(date));
}

// As células que preenchemos são entradas de fórmulas que já existem na
// planilha (contagem de inserções, Valor Tabela, Total Mídia...), mas os
// valores em cache no arquivo continuam sendo os do modelo vazio (zero). Sem
// isso o Excel abre e mostra os zeros antigos em vez de recalcular — foi
// exatamente o que aconteceu na primeira versão desta exportação.
export function forceFullRecalc(workbookXml) {
    if (/<calcPr[^>]*\bfullCalcOnLoad="1"/.test(workbookXml)) return workbookXml;
    if (/<calcPr[^>]*\/>/.test(workbookXml)) {
        return workbookXml.replace(/<calcPr([^>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
    }
    return workbookXml.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
}

// Aplica os dados da Mídia Avulsa no XML da aba "Patrocínios_".
// Só escreve entrada: nada de total/subtotal, porque Valor Tabela, Total
// Mídia, Bruto e a contagem de inserções são fórmulas do próprio arquivo.
export function fillPiSheet(sheetXml, {
    pracaLabel,
    mesVeiculacao,   // Date — primeiro dia do mês selecionado
    titulosUsados,   // [{ letra, nome }]
    duracaoLabel,    // ex. '30"'
    descontoPercent, // 0-100
    rows,            // [{ sigla, programa, dias, marks, unit }]
}) {
    let xml = sheetXml;
    const descontoFraction = (Number(descontoPercent) || 0) / 100;

    xml = setCellText(xml, 'A3', pracaLabel);
    if (mesVeiculacao) xml = setCellDate(xml, 'AH4', mesVeiculacao);
    xml = setCellNumber(xml, 'BA50', descontoFraction);

    titulosUsados.forEach(t => {
        const row = TITULO_ROW[t.letra];
        if (!row) return;
        xml = setCellText(xml, `B${row}`, t.nome);
        xml = setCellText(xml, `O${row}`, duracaoLabel);
    });

    rows.forEach((row, i) => {
        const r = PROGRAMA_FIRST_ROW + i;
        if (r > PROGRAMA_LAST_ROW) return; // o formulário só tem 16 linhas
        xml = setCellText(xml, `A${r}`, row.sigla);
        xml = setCellText(xml, `B${r}`, row.programa);
        xml = setCellText(xml, `C${r}`, row.dias);
        xml = setCellNumber(xml, `F${r}`, descontoFraction);
        xml = setCellText(xml, `AY${r}`, duracaoLabel);
        xml = setCellNumber(xml, `AZ${r}`, row.unit);
        Object.entries(row.marks || {}).forEach(([day, mark]) => {
            if (!mark) return;
            xml = setCellText(xml, `${colLetter(Number(day) + DAY_COL_OFFSET)}${r}`, mark);
        });
    });

    return xml;
}
