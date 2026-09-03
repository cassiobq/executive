# Mídia Avulsa — exportar PI (Pedido de Inserção)

## Contexto

O usuário forneceu o modelo real usado hoje pra fechar uma inserção avulsa
(`Modelo_de_PI_Limpo.xlsx`, aba "Patrocínios_", com abas auxiliares
`BDados` e `Dados Preços Globo_2022_04`) e exemplos de PI reais já
preenchidas. A estrutura da planilha é quase idêntica à do nosso Mapa de
Inserções — mesmo formato de marca (`\d*[A-Z]`, dígito = quantidade,
letra = título), mesma lógica de dias do mês, letras de título A–F (a
planilha tem até G, nunca usado por nós).

Hoje o usuário monta a PI manualmente a partir dos dados já calculados
no Mídia Avulsa (Slide). O pedido: um botão "Exportar para PI", ao lado
do "Exportar PDF" já existente, que entrega o documento já preenchido —
poupando esse trabalho manual.

## O contrato (definido pelo usuário, é o que manda aqui)

O Executive faz **exatamente** três coisas:

1. puxa as informações do mapa feito pelo usuário;
2. preenche sigla, programa, ocorrência, inserções (as marcas dia a dia),
   duração e valor unitário da sigla;
3. a planilha se encarrega de preencher o resto, a partir desses dados.

E o Executive **não**:

- altera fórmulas da planilha — de nenhuma forma, incluindo apagar o
  valor em cache (`<v>`) de uma célula de fórmula;
- insere, altera ou remove dados em qualquer célula que não seja uma das
  células de entrada da grade (linhas 32–47) listadas no mapeamento
  abaixo.

Esse contrato é verificável e está coberto por teste: `piXlsx.test.js`
afirma que as células de fórmula vizinhas (`AX32`, `BA32`) saem byte a
byte iguais, com o `<v>` em cache intacto.

## Decisões

### Como a fidelidade é garantida (histórico das duas tentativas descartadas)

O requisito do usuário é que o documento fique **idêntico** ao formulário
real. Duas abordagens foram construídas e rejeitadas antes de chegar na
atual:

1. **Réplica em HTML/CSS + `html-to-image`/`jsPDF`** (mesmo pipeline do
   Mapa de Inserções). Rejeitada: mesmo reconstruída a partir dos dados
   de estilo lidos célula a célula do `.xlsx` (fonte Calibri, cores
   `#C0C0C0`, bordas, logo embutida, formas de assinatura), o resultado
   continuava visivelmente diferente. Navegador e Excel são motores de
   renderização diferentes — reimplementar o layout não converge pra
   "idêntico".
2. **Preencher o `.xlsx` real via exceljs.** Rejeitada: a biblioteca
   carrega e reserializa o arquivo inteiro, e no caminho descartou
   `showZeros="0"` da aba (linhas vazias passaram a exibir "0"),
   `xl/metadata.xml` (referenciado pelo `cm="1"` da fórmula dinâmica
   MAP/LAMBDA que conta inserções), `xl/printerSettings` (configuração de
   impressão, justamente o que o usuário usa pra salvar em PDF), e
   reescreveu o `pageSetup`.

**Abordagem final: escrita cirúrgica no XML de dentro do `.xlsx`.** O
arquivo é um ZIP de XMLs; abrimos com jszip, trocamos apenas o conteúdo
de células que **já existem** no template (preservando o atributo `s` de
estilo de cada uma) e re-empacotamos. Só `xl/worksheets/sheet1.xml` muda;
todo o resto — estilos, logo, formas, fórmulas, impressão, metadata,
`calcChain` — sai byte a byte igual ao original.

### O recálculo ao abrir (`fullCalcOnLoad`) é obrigatório

Deixando o arquivo 100% intacto fora das células de entrada, o Excel abre
a PI e **não calcula nada**: ele recebe um `calcChain.xml` completo e o
`<v>0</v>` que as fórmulas tinham quando o modelo estava vazio, então
considera a planilha já calculada. Como a aba tem `showZeros="0"`, esse
zero aparece como **célula em branco** — a coluna TOTAL some inteira, sem
erro nenhum. Basta o usuário digitar qualquer coisa no mapa que a cadeia
suja e tudo volta ao normal.

Por isso o export marca `fullCalcOnLoad="1"` no `<calcPr>` do
`xl/workbook.xml`. Isso **não** é mexer em fórmula: `calcPr` é a
configuração de cálculo do documento, e o atributo existe no OOXML
exatamente pra dizer "recalcule ao abrir". Medido no arquivo gerado: o
`workbook.xml` difere do template em 19 bytes — só o atributo — e o
`calcId` original é preservado.

### O que NÃO funciona: apagar o valor em cache

Apagar o `<v>` das células de fórmula (e remover o `calcChain.xml`) foi
tentado e quebra o arquivo. Numa célula de matriz dinâmica
(`<f t="array" ref="AX32">` com `cm="1"` apontando pro `xl/metadata.xml`)
o valor em cache é o que descreve o intervalo derramado; sem ele o Excel
rebaixa a fórmula pra matricial antiga (CSE, aparece com `{}` na barra de
fórmulas). É o inverso do que se quer, e além disso viola o contrato
acima. Nenhum `<v>` é tocado.

### Formato de saída

O botão entrega o **`.xlsx` preenchido** (compartilhamento nativo no
celular, download no desktop). O usuário abre no Excel/Sheets e salva ou
imprime como PDF de lá. Gerar o PDF automaticamente exigiria um motor de
planilha (Excel/LibreOffice) rodando em servidor — este app é 100%
estático, sem backend, e adicionar essa infraestrutura foi considerado
desproporcional.

### Demais decisões

- **Segundagem:** o botão fica **bloqueado** sempre que mais de uma
  segundagem (10"/15"/30") estiver ativa ao mesmo tempo. Só habilita com
  exatamente uma — é ela que define duração/valor/desconto do documento
  inteiro. Clicar enquanto bloqueado mostra um `alert` explicando o
  motivo (tooltip `title` não aparece em toque, e o app é mobile-first;
  por isso a classe `is-blocked` em vez do atributo `disabled`, que
  engoliria o toque).
- **Botão nos mesmos lugares do "Exportar PDF"**: dentro do popup de
  exportação mobile e no botão flutuante.
- **Dados de cliente/empresa** (nome, endereço, contato, CGC, número da
  PI, produto, segmento, material, condição negociada): ficam em branco —
  são dados que a PI real tem mas o Mídia Avulsa não coleta.
- **Praça, mês e títulos também não são escritos.** Chegaram a ser
  escritos numa versão anterior e foram removidos: estão fora das células
  de entrada demarcadas pelo usuário.

## Não-objetivos

- Não geramos PDF (o usuário faz esse passo no Excel/Sheets).
- Não recriamos o layout — nenhum componente React desenha a PI.
- Não adicionamos campo de duração por título (duração única, vinda da
  segundagem ativa).
- Não coletamos dados de cliente/empresa nesta etapa.
- Não resolvemos o caso de múltiplas segundagens ativas — só bloqueamos.

## Mapeamento de células (aba "Patrocínios_" = `xl/worksheets/sheet1.xml`)

Tudo mora na grade de programas, linhas **32 a 47** (16 linhas, o que o
formulário comporta). Nada fora dela é tocado.

| Célula | Conteúdo | Fonte no app |
|---|---|---|
| `A32`–`A47` | SIGLA | `piRows[].sigla` |
| `B32`–`B47` | PROGRAMA | `piRows[].programa` |
| `C32`–`C47` | OCORRÊNCIA | `piRows[].dias` |
| `F32`–`F47` | DESC.% (fração) | `descontoPercent / 100` — só se > 0 |
| `H..AL` (linhas 32–47) | Marcas dia a dia | `row.marks[dia]` — dia 1 = coluna H (`DAY_COL_OFFSET = 7`) |
| `AY32`–`AY47` | Duração | segundagem ativa, ex. `30"` |
| `AZ32`–`AZ47` | VLR MÍDIA (unitário) | `unitValor30/15/10` |

Todas essas células são, no modelo em branco, células vazias só com
estilo (`<c r="A32" s="95"/>`) — sem fórmula e sem atributo `cm`.

## Implementação

- `src/utils/piXlsx.js` — helpers puros e testados: `colLetter`,
  `escapeXml`, `setCellText`/`setCellNumber` (preservam o atributo `s` de
  estilo; valor vazio limpa a célula em vez de escrever string vazia) e
  `fillPiSheet` (aplica o mapeamento acima). Texto vai como
  `t="inlineStr"` pra não mexer no `xl/sharedStrings.xml`, que é
  compartilhado com as outras abas. Mais `forceFullCalc`, que marca o
  recálculo ao abrir no `xl/workbook.xml` (única parte fora da aba que o
  export toca).
- `src/pages/MidiaAvulsaPage.jsx` — `handleExportPI` busca o template
  (`public/pi-template.xlsx`, servido via `import.meta.env.BASE_URL`),
  aplica o patch com jszip e entrega via `navigator.share` com fallback
  de download.
- Dependência: `jszip` (~97KB), carregada sob demanda por `import()`.
- O mesmo código existe nos dois apps (raiz e `teste/`), com o template
  duplicado em `public/pi-template.xlsx` e `teste/public/pi-template.xlsx`
  (byte a byte igual ao arquivo que o usuário enviou).

## Casos de borda

- **Mais de 16 programas**: o formulário só tem 16 linhas (32–47); as
  excedentes são ignoradas. O app já limita em 13 (`MAX_ROWS`).
- **Célula ausente no template**: `setCell*` não faz nada (em vez de
  injetar uma célula sem estilo). Todas as células do mapeamento foram
  verificadas como existentes no modelo.
- **Sem desconto**: `F` fica vazia, em vez de receber `0%`.
- **Duas ou mais segundagens ativas**: botão bloqueado com `alert`.

## Testes

- `src/utils/piXlsx.test.js` (`node --test`): colunas, escape de XML,
  escrita preservando estilo, limpeza de célula, célula ausente, não
  vazar pra célula de nome parecido, limite de 16 linhas, e — o teste que
  guarda o contrato — que `fillPiSheet` escreve só as células de entrada
  e deixa as células de fórmula vizinhas byte a byte iguais, com o `<v>`
  em cache intacto.
- Verificação end-to-end (Playwright + inspeção do arquivo gerado):
  exportar com programas reais e comparar o ZIP gerado contra o template.
  Medido: mesma lista de partes, **só `xl/worksheets/sheet1.xml` difere**,
  2704 células em ambos, nenhuma adicionada ou removida, **zero células de
  fórmula alteradas**, 11 células de dados alteradas.

## Limitações conhecidas

- **O recálculo não é verificável localmente.** LibreOffice headless não
  consegue avaliar as fórmulas dinâmicas `_xlfn.MAP`/`_xlfn.LAMBDA` deste
  modelo — estoura o tempo (testado até 895s) inclusive no arquivo
  original, sem nenhuma alteração nossa. Conferir números calculados
  exige abrir no Excel/Sheets.
- **A fórmula de contagem de inserções exige um Excel com `MAP`/`LAMBDA`.**
  Num Excel que não conhece essas funções ela aparece como
  `{=SOMA(_xlfn.MAP(...))}` — com chaves, porque a matriz dinâmica é
  rebaixada pra CSE — e devolve `#NOME?`. Isso vale pro modelo original
  também, sem passar pela exportação; o Excel Web avalia normalmente.
  Enquanto o arquivo não recalculava, esse `#NOME?` ficava escondido
  atrás do zero em cache, então ele só aparece agora que o recálculo é
  forçado. Se surgir, a saída é abrir no Excel Web/Sheets ou atualizar o
  Excel — não é algo que o Executive introduza nem possa corrigir sem
  alterar a fórmula do modelo.
