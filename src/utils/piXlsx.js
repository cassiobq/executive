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

// NÃO mexemos em célula de fórmula, de nenhuma forma — nem no texto da
// fórmula, nem no `<v>` com o resultado em cache. Apagar esse cache já foi
// tentado e é justamente o que quebra: numa célula de matriz dinâmica
// (`<f t="array" ref="AX32">` + `cm="1"` apontando pro xl/metadata.xml) o
// valor em cache é o que descreve o intervalo derramado, e sem ele o Excel
// rebaixa a fórmula pra matricial antiga (CSE).
//
// Só que, deixando tudo intacto, o arquivo chega ao Excel com um
// `calcChain.xml` completo e um `<v>0</v>` de quando o modelo estava vazio:
// da ótica dele a planilha já está calculada, então ele não recalcula, e o
// `showZeros="0"` da aba faz esse zero aparecer como célula em branco — some
// a coluna TOTAL inteira, sem erro nenhum. Qualquer edição do usuário suja a
// cadeia e faz tudo voltar ao normal.
//
// A correção é dizer ao Excel, no nível do documento, que ele deve
// recalcular ao abrir. `fullCalcOnLoad` é a chave do OOXML que existe
// exatamente pra isso, e ela não é uma fórmula nem uma célula: é uma
// configuração de cálculo do workbook. Nenhuma fórmula é tocada.
export function forceFullCalc(workbookXml) {
    if (/<calcPr[^>]*\bfullCalcOnLoad="1"/.test(workbookXml)) return workbookXml;
    if (/<calcPr[^>]*\/>/.test(workbookXml)) {
        return workbookXml.replace(/<calcPr([^>]*?)\s*\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
    }
    if (/<calcPr[^>]*>/.test(workbookXml)) {
        return workbookXml.replace(/<calcPr([^>]*?)>/, '<calcPr$1 fullCalcOnLoad="1">');
    }
    return workbookXml.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
}

// Preenche APENAS as células de entrada da grade (linhas 32-47): sigla,
// programa, ocorrência, desconto, marcações dia a dia, duração e valor
// unitário. Nada além disso é escrito — nem praça, nem mês, nem título, nem
// TOTAL, nem Valor Tabela. A planilha calcula o resto a partir daqui.
export function fillPiSheet(sheetXml, {
    descontoPercent, // 0-100
    duracaoLabel,    // ex. '30"'
    rows,            // [{ sigla, programa, dias, marks, unit }]
}) {
    let xml = sheetXml;
    const desconto = Number(descontoPercent) || 0;

    rows.forEach((row, i) => {
        const r = PROGRAMA_FIRST_ROW + i;
        if (r > PROGRAMA_LAST_ROW) return; // o formulário só tem 16 linhas
        xml = setCellText(xml, `A${r}`, row.sigla);
        xml = setCellText(xml, `B${r}`, row.programa);
        xml = setCellText(xml, `C${r}`, row.dias);
        // Sem desconto, deixa a célula vazia em vez de escrever 0%.
        if (desconto > 0) xml = setCellNumber(xml, `F${r}`, desconto / 100);
        Object.entries(row.marks || {}).forEach(([day, mark]) => {
            if (!mark) return;
            xml = setCellText(xml, `${colLetter(Number(day) + DAY_COL_OFFSET)}${r}`, mark);
        });
        xml = setCellText(xml, `AY${r}`, duracaoLabel);
        if (row.unit) xml = setCellNumber(xml, `AZ${r}`, row.unit);
    });

    return xml;
}
