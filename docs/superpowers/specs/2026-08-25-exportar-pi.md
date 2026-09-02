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
  valor em cache de uma fórmula ou marcar recálculo no `workbook.xml`;
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

### Nada de "ajudar o Excel a recalcular"

Duas tentativas de forçar recálculo quebraram o arquivo e foram
revertidas:

- `fullCalcOnLoad="1"` no `workbook.xml`;
- apagar o `<v>` em cache das células de fórmula (e remover o
  `calcChain.xml`).

Nos dois casos o Excel rebaixou a fórmula dinâmica de contagem de
inserções (`_xlfn.MAP`/`_xlfn.LAMBDA`, ligada ao `xl/metadata.xml` pelo
atributo `cm`) pra fórmula matricial antiga (CSE, aparece com `{}` na
barra de fórmulas) e devolveu `#NOME?` na coluna inteira. A planilha
recalcula sozinha quando o usuário edita/abre; o nosso trabalho termina
ao entregar as entradas.

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
  compartilhado com as outras abas.
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
- **A fórmula de contagem de inserções do modelo só avalia no Excel
  Web.** Constatado pelo usuário: no Excel desktop dele a fórmula aparece
  como `{=SOMA(_xlfn.MAP(...))}` e retorna `#NOME?`; no Excel Web ela
  funciona. É uma diferença de versão/capacidade do Excel (MAP e LAMBDA
  são funções novas), presente no modelo original — não algo introduzido
  pela exportação. Se isso incomodar na prática, a saída é o usuário
  abrir a PI no Excel Web / Sheets, ou o modelo trocar essa fórmula por
  uma equivalente clássica (`CONT.SE`/`SOMARPRODUTO`) — decisão dele,
  sobre o modelo, não sobre o Executive.
