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
   reescreveu o `pageSetup`. Além disso não forçava recálculo, então o
   Excel abria mostrando os zeros em cache do modelo em branco — todos os
   totais saíam zerados.

**Abordagem final: escrita cirúrgica no XML de dentro do `.xlsx`.** O
arquivo é um ZIP de XMLs; abrimos com jszip, trocamos apenas o conteúdo de
células que **já existem** no template (preservando o atributo `s` de
estilo de cada uma), marcamos `fullCalcOnLoad="1"` no `workbook.xml` e
re-empacotamos. Tudo o mais — estilos, logo, formas, fórmulas,
impressão, metadata — continua igual ao original.

### Formato de saída

O botão entrega o **`.xlsx` preenchido** (compartilhamento nativo no
celular, download no desktop). O usuário abre no Excel/Sheets e salva ou
imprime como PDF de lá. Gerar o PDF automaticamente exigiria um motor de
planilha (Excel/LibreOffice) rodando em servidor — este app é 100%
estático, sem backend, e adicionar essa infraestrutura foi considerado
desproporcional.

### Demais decisões

- **Segundagem:** o botão fica **desabilitado** sempre que mais de uma
  segundagem (10"/15"/30") estiver ativa ao mesmo tempo. Só habilita com
  exatamente uma — é ela que define duração/valor/desconto do documento
  inteiro. Clicar enquanto bloqueado mostra um `alert` explicando o
  motivo (tooltip `title` não aparece em toque, e o app é mobile-first).
- **Botão nos mesmos lugares do "Exportar PDF"**: dentro do popup de
  exportação mobile e no botão flutuante.
- **Dados de cliente/empresa** (nome, endereço, contato, CGC, número da
  PI, produto, segmento, material, condição negociada): ficam em branco —
  são dados que a PI real tem mas o Mídia Avulsa não coleta.
- **Totais não são escritos por nós.** Valor Tabela, Total Mídia, Bruto e
  a contagem de inserções por linha são fórmulas do próprio arquivo;
  escrevemos só as entradas e deixamos o Excel calcular.

## Não-objetivos

- Não geramos PDF (o usuário faz esse passo no Excel/Sheets).
- Não recriamos o layout — nenhum componente React desenha a PI.
- Não adicionamos campo de duração por título (duração única, vinda da
  segundagem ativa).
- Não coletamos dados de cliente/empresa nesta etapa.
- Não resolvemos o caso de múltiplas segundagens ativas — só bloqueamos.

## Mapeamento de células (aba "Patrocínios_")

| Célula | Conteúdo | Fonte no app |
|---|---|---|
| `A3` | Praça | `PRACAS.find(...).label` |
| `AH4` | Mês de veiculação (serial de data) | mês selecionado, dia 1 |
| `B16`–`B21` | Nome do título (A–F) | `titulosUsados[].nome` |
| `O16`–`O21` | Duração do título | segundagem ativa, ex. `30"` |
| `A32`–`A47` | SIGLA | `enrichedRows[].sigla` |
| `B32`–`B47` | PROGRAMA | `enrichedRows[].programa` |
| `C32`–`C47` | OCORRÊNCIA | `enrichedRows[].dias` |
| `F32`–`F47` | DESC.% (fração) | `descontoPercent / 100` |
| `H..AL` (linhas 32–47) | Marcas dia a dia | `row.marks[dia]` — dia 1 = coluna H |
| `AY32`–`AY47` | Duração | segundagem ativa |
| `AZ32`–`AZ47` | VLR MÍDIA (unitário) | `unitValor30/15/10` |
| `BA50` | Desconto (fração) | `descontoPercent / 100` |

Não escrevemos em `BA4` (`=NOW()`, a data de emissão do próprio modelo)
nem em nenhuma célula de fórmula.

## Implementação

- `src/utils/piXlsx.js` — helpers puros e testados: `colLetter`,
  `escapeXml`, `dateToExcelSerial`, `setCellText`/`setCellNumber`
  (preservam o estilo da célula), `forceFullRecalc` e `fillPiSheet`
  (aplica o mapeamento acima).
- `src/pages/MidiaAvulsaPage.jsx` — `handleExportPI` busca o template
  (`public/pi-template.xlsx`, servido via `import.meta.env.BASE_URL`),
  aplica o patch com jszip e entrega via `navigator.share` com fallback
  de download.
- Dependência: `jszip` (~97KB), carregada sob demanda por `import()`.

## Casos de borda

- **Mais de 16 programas**: o formulário só tem 16 linhas (32–47); as
  excedentes são ignoradas. O app já limita em 13 (`MAX_ROWS`).
- **Célula ausente no template**: `setCell*` não faz nada (em vez de
  injetar uma célula sem estilo). Todas as células do mapeamento foram
  verificadas como existentes no modelo.
- **Praça diferente de Rio Verde**: o bloco da emissora vem do próprio
  template (fórmula `VLOOKUP` na `A3`), então acompanha a praça escrita.
- **Duas ou mais segundagens ativas**: botão bloqueado com `alert`.

## Testes

- `src/utils/piXlsx.test.js` (`node --test`): colunas, serial de data,
  escrita preservando estilo, célula ausente, limite de 16 linhas,
  `forceFullRecalc` idempotente.
- Verificação end-to-end (Playwright + inspeção do arquivo gerado):
  exportar com programas reais e conferir, comparando o ZIP gerado contra
  o template, que **nenhuma parte do arquivo é perdida** e que **apenas as
  células do mapeamento mudam** (medido: 2704 células em ambos, 19
  alteradas, nenhuma adicionada ou removida).
- **Limitação conhecida:** o recálculo não é verificável localmente —
  LibreOffice (headless) não consegue avaliar as fórmulas dinâmicas
  `_xlfn.MAP`/`_xlfn.LAMBDA` deste modelo e estoura o tempo. A conferência
  dos números calculados depende de abrir o arquivo no Excel/Sheets.
