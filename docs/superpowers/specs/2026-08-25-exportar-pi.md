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
   duração e valor unitário da sigla — mais mês de veiculação, desconto
   global, título/duração do comercial e, quando o usuário informa um
   CNPJ, os dados de cliente que a consulta pública devolver;
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
- **Dados de cliente via CNPJ, opcional.** Clicar em "Exportar para PI"
  abre um dialog pedindo o CNPJ antes de gerar o arquivo — ver "Dados de
  cliente" na decisão seguinte. "Pular e exportar" mantém o comportamento
  original (nada de cliente escrito). Número da PI, produto, segmento,
  material e condição negociada continuam de fora: não vêm do cadastro de
  CNPJ, e a PI não tem campo pra eles vindo de nenhuma fonte disponível
  aqui.
- **Praça continua sem ser escrita.** Mês e títulos, que também tinham
  sido removidos numa versão anterior por estarem fora do que o usuário
  havia demarcado, voltaram por pedido explícito — ver mapeamento abaixo.
  Praça nunca foi pedida de volta.
- **Dados de cliente: consulta de CNPJ, não formulário manual.** O
  usuário só digita o CNPJ; o app consulta a BrasilAPI
  (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, pública, sem chave, com
  CORS liberado — dá pra chamar direto do navegador, mantendo o app
  100% estático) e preenche o que der match. Escolhida em vez de
  ReceitaWS (outra opção pública) por não exigir tratamento de
  rate-limit no cliente. Falha de rede, CNPJ inválido ou não encontrado
  não bloqueiam a exportação: o dialog mostra o erro inline e o usuário
  pode tentar de novo ou pular.

## Não-objetivos

- Não geramos PDF (o usuário faz esse passo no Excel/Sheets).
- Não recriamos o layout — nenhum componente React desenha a PI.
- Não adicionamos campo de duração por título (duração única, vinda da
  segundagem ativa).
- Não oferecemos formulário manual pros dados de cliente — só a consulta
  por CNPJ; sem CNPJ, ficam em branco como antes.
- Não resolvemos o caso de múltiplas segundagens ativas — só bloqueamos.

## Mapeamento de células (aba "Patrocínios_" = `xl/worksheets/sheet1.xml`)

### Mês, desconto global e bloco de títulos

| Célula | Conteúdo | Fonte no app |
|---|---|---|
| `AH4` (mesclada `AH4:AJ4`) | Mês de veiculação | serial Excel do dia 1 do mês selecionado (`dateToExcelSerial`) |
| `BA50` | Desconto do documento (fração) | `descontoPercent / 100` — só se > 0 (alimenta `BA51 = BA48-(BA48*BA50)`, fórmula do próprio arquivo) |
| `B16`–`B21` | Nome do título (A–F, uma linha fixa por letra) | `titulosUsados[].nome` — título usado sem nome cadastrado cai pra letra, em vez de ficar em branco |
| `O16`–`O21` | Duração do título (número, ex. `30`) | segundagem ativa — mesmo valor em todas as linhas usadas, já que só uma pode estar ativa por vez |

### Grade de programas (linhas 32–47, 16 linhas — o que o formulário comporta)

| Célula | Conteúdo | Fonte no app |
|---|---|---|
| `A32`–`A47` | SIGLA | `piRows[].sigla` |
| `B32`–`B47` | PROGRAMA | `piRows[].programa` |
| `C32`–`C47` | OCORRÊNCIA | `piRows[].dias` |
| `F32`–`F47` | DESC.% por linha (fração) | `descontoPercent / 100` — só se > 0 |
| `H..AL` (linhas 32–47) | Marcas dia a dia | `row.marks[dia]` — dia 1 = coluna H (`DAY_COL_OFFSET = 7`) |
| `AY32`–`AY47` | Duração | segundagem ativa, ex. `30"` |
| `AZ32`–`AZ47` | VLR MÍDIA (unitário) | `unitValor30/15/10` |

### Dados de cliente (linhas 6–13), só quando o usuário informa um CNPJ

| Célula | Conteúdo | Campo da BrasilAPI |
|---|---|---|
| `A7` | Cliente (nome completo) | `razao_social` |
| `A9` | Nome Fantasia | `nome_fantasia` (cai pra `razao_social` se vazio) |
| `T9` | Endereço | `descricao_tipo_de_logradouro` + `logradouro`, `numero`, `complemento` |
| `A11` | Bairro | `bairro` |
| `P11` | Cidade | `municipio` |
| `X11` | UF | `uf` |
| `Z11` | CEP | `cep` (formatado `NNNNN-NNN`) |
| `A13` | Fone | `ddd_telefone_1` (formatado) |
| `P13` | CGC/CPF | `cnpj` (formatado) |

**Fora do mapeamento, de propósito**: `AG7` (Nome contato/Ag), `AG9`
(Código contato/Ag), `J13` (Fax) e `V13` (Insc. Estadual) — a Receita
Federal não tem esses dados; ficam em branco pro usuário preencher à mão
se precisar. Praça (`A3`) continua fora do mapeamento também (nunca foi
pedida de volta desde que saiu na primeira versão).

Todas as células acima são, no modelo em branco, células vazias só com
estilo (`<c r="A32" s="95"/>`) — sem fórmula e sem atributo `cm` — com
uma única exceção: `O16` já vem com o valor `30` no template (um
default do próprio modelo pro título A). O app sobrescreve normalmente
quando título A está em uso, e limpa a célula quando não está.

## Implementação

- `src/utils/piXlsx.js` — helpers puros e testados: `colLetter`,
  `escapeXml`, `dateToExcelSerial`, `setCellText`/`setCellNumber`
  (preservam o atributo `s` de estilo; valor vazio limpa a célula em vez
  de escrever string vazia) e `fillPiSheet` (aplica o mapeamento acima).
  Texto vai como `t="inlineStr"` pra não mexer no `xl/sharedStrings.xml`,
  que é compartilhado com as outras abas. Mais `forceFullCalc`, que marca
  o recálculo ao abrir no `xl/workbook.xml` (única parte fora da aba que
  o export toca).
- `src/utils/cnpj.js` — validação, máscara e formatação de CNPJ, e
  `fetchCnpjData` (busca na BrasilAPI + traduz a resposta pro formato que
  `fillPiSheet` espera em `cliente`). Puro e testado à parte de
  `piXlsx.js`: este último só sabe escrever um objeto já normalizado, sem
  depender do formato de resposta de uma API específica.
- `src/pages/MidiaAvulsaPage.jsx` — clicar em "Exportar para PI" abre um
  dialog ("Dados do cliente") em vez de exportar na hora: o usuário digita
  um CNPJ e clica "Buscar e exportar" (consulta a BrasilAPI, preenche o
  cliente, exporta), ou "Pular e exportar" (exporta sem esses dados — o
  comportamento de sempre). `runExportPI(cliente)` é o corpo do que antes
  era `handleExportPI`: busca o template (`public/pi-template.xlsx`,
  servido via `import.meta.env.BASE_URL`), aplica o patch com jszip e
  entrega via `navigator.share` com fallback de download.
- Dependência: `jszip` (~97KB), carregada sob demanda por `import()`. A
  consulta de CNPJ usa `fetch` direto (BrasilAPI é pública, sem chave, com
  CORS liberado) — nenhuma dependência nova.
- O mesmo código existe nos dois apps (raiz e `teste/`), com o template
  duplicado em `public/pi-template.xlsx` e `teste/public/pi-template.xlsx`
  (byte a byte igual ao arquivo que o usuário enviou).

## Casos de borda

- **Mais de 16 programas**: o formulário só tem 16 linhas (32–47); as
  excedentes são ignoradas. O app já limita em 13 (`MAX_ROWS`).
- **Célula ausente no template**: `setCell*` não faz nada (em vez de
  injetar uma célula sem estilo). Todas as células do mapeamento foram
  verificadas como existentes no modelo.
- **Sem desconto**: `F` e `BA50` ficam vazias, em vez de receber `0%`.
- **Duas ou mais segundagens ativas**: botão bloqueado com `alert`, antes
  mesmo de abrir o dialog de cliente.
- **Título usado no mapa sem nome cadastrado**: a linha do bloco de
  títulos mostra a letra (`A`, `B`...) em vez de ficar em branco — melhor
  que parecer não-usada (ver `computeTitulosUsados`).
- **CNPJ inválido, não encontrado, ou falha de rede/CORS**: o dialog
  mostra o erro inline (mensagens em pt-BR de `fetchCnpjData`) sem fechar
  nem bloquear — o usuário tenta de novo ou clica "Pular e exportar".
- **Campo sem match na resposta da API** (ex. CNPJ sem `nome_fantasia`):
  cai pro melhor substituto disponível (nome fantasia → razão social) ou
  fica vazio; nunca escreve `undefined`/`null` como texto.

## Testes

- `src/utils/piXlsx.test.js` (`node --test`): colunas, escape de XML,
  escrita preservando estilo, limpeza de célula, célula ausente, não
  vazar pra célula de nome parecido, limite de 16 linhas, serial de data
  (`dateToExcelSerial`, conferido contra o próprio default `30-jan-2026`
  do template), bloco de títulos (usado/não-usado/sem nome cadastrado),
  desconto global, dados de cliente presentes/ausentes, e — o teste que
  guarda o contrato — que `fillPiSheet` escreve só as células de entrada
  e deixa as células de fórmula vizinhas byte a byte iguais, com o `<v>`
  em cache intacto.
- `src/utils/cnpj.test.js`: máscara/formatação de CNPJ, CEP e telefone,
  mapeamento da resposta da BrasilAPI, e `fetchCnpjData` com `fetch`
  mockado (404, outro erro HTTP, falha de rede, sucesso) — sem depender
  de rede real no teste.
- Verificação end-to-end (Playwright + inspeção do arquivo gerado):
  exportar com todos os campos novos preenchidos e comparar o ZIP gerado
  contra o template. Medido: mesma lista de partes, **só
  `xl/worksheets/sheet1.xml` e `xl/workbook.xml` diferem**, 2704 células
  em ambos, nenhuma adicionada ou removida, **zero células de fórmula
  alteradas** (das 624 do arquivo), 27 células de dados alteradas. Também
  dirigido pelo navegador real (Playwright contra o dev server): o dialog
  abre ao clicar em "Exportar para PI", a validação de CNPJ curto mostra
  o erro inline, a máscara aplica corretamente enquanto digita, e "Pular
  e exportar" gera e baixa o `.xlsx` — inspecionado depois: `AH4` com o
  mês certo, `fullCalcOnLoad="1"` no `workbook.xml`, e nada de cliente
  escrito (caminho sem CNPJ).

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
