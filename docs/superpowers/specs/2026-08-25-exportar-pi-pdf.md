# Mídia Avulsa — exportar PI (Pedido de Inserção) em PDF

## Contexto

O usuário forneceu o modelo real usado hoje pra fechar uma inserção avulsa
(`Modelo_de_PI_Limpo.xlsx`, planilha "Patrocínios_", com abas auxiliares
`BDados` e `Dados Preços Globo_2022_04`) e um exemplo de PI real já
preenchida e impressa em PDF (`PI_FAQUI__SET26.pdf`, praça Rio Verde,
1 página A4 paisagem). A estrutura da planilha é quase idêntica à do
nosso Mapa de Inserções — mesmo formato de marca (`\d*[A-Z]`, dígito =
quantidade, letra = título), mesma lógica de dias do mês, letras de
título A–F (a planilha tem até G, nunca usado por nós).

Hoje o usuário monta a PI manualmente a partir dos dados já calculados
no Mídia Avulsa (Slide). O pedido: um botão "Exportar para PI", ao lado
do "Exportar PDF" já existente, que gera diretamente um PDF no layout
real da PI, com os programas, marcas e valores já preenchidos —
poupando esse trabalho manual.

## Decisões (brainstorming)

- **Não é exportação de `.xlsx`.** Não vamos manipular o arquivo Excel
  real em tempo de execução (nem exceljs, nem carregar o `.xlsx` de
  750KB no navegador). Construímos um componente React que replica
  visualmente o layout da PI e reaproveitamos o pipeline de PDF que já
  existe (`html-to-image` + `jsPDF`, share nativo com fallback de
  download) — mesmo padrão do "Exportar PDF" do mapa.
- **Réplica fiel do formulário**, não um resumo simplificado — inclusive
  os campos de empresa/cliente aparecendo como caixas vazias, igual ao
  documento oficial.
- **1 página A4 paisagem**, confirmado pelo exemplo real (a 2ª página do
  PDF de exemplo está em branco — a impressão real da planilha já cabe
  numa página só, mesmo com até 31 colunas de dia).
- **Segundagem:** o botão "Exportar para PI" fica **desabilitado**
  sempre que mais de uma segundagem (10"/15"/30") estiver ativa ao
  mesmo tempo no Card/Slide. Só habilita quando exatamente uma está
  ativa — essa é a segundagem/valor/desconto único que preenche o
  documento inteiro (a PI real pode ter duração diferente por VT, mas
  isso não é modelado aqui; evitamos a ambiguidade em vez de resolvê-la).
- **Botão nos mesmos lugares do "Exportar PDF"**: dentro do popup de
  exportação mobile (ao lado do botão de compartilhar PDF) e no botão
  flutuante do desktop.
- **Dados da emissora** (razão social/endereço/CNPJ no cabeçalho): só
  temos o dado confirmado de Rio Verde (do exemplo real). Fixamos esse
  bloco só pra praça Rio Verde; nas outras 7 praças fica em branco até
  termos os dados reais.
- **Dados de cliente/empresa** (nome, endereço, contato, CGC, PI número,
  produto, segmento, material, condição negociada): ficam em branco,
  igual ao mapa/legenda hoje — é dado que a PI real tem mas o Mídia
  Avulsa não coleta.

## Não-objetivos

- Não editamos nem geramos `.xlsx`.
- Não adicionamos campo de duração por título (título único global via
  segundagem ativa, não por VT).
- Não coletamos dados de cliente/empresa nesta etapa (fica pra depois).
- Não resolvemos o caso de múltiplas segundagens ativas simultaneamente
  — só desabilitamos o botão nesse caso.
- Não tentamos exportar `Comissão`/`Líquido` — o PDF real de exemplo não
  imprime essas duas linhas (são internas), então nosso replica também
  não as mostra.

## Mapeamento de dados

| Campo no PDF da PI | Fonte no app | Observação |
|---|---|---|
| Praça | `PRACAS.find(p => p.key === selectedPraca).label` | mesmos rótulos maiúsculos do exemplo |
| Emissora (razão social/endereço/CNPJ) | fixo, só quando `selectedPraca === 'rio_verde'` | `TELEVISÃO RIVIERA LTDA`, `Rodovia BR-452, KM:01 - SETOR INDUSTRIAL, Rio Verde-GO, CEP 75.901-970`, `Inscrita no CNPJ/MF sob o nº. 01.073.899/0001-35` — em branco nas outras 7 praças |
| Mês Veiculação | mês selecionado (`monthLabel`/mês-ano) | ex.: `set/26` |
| Tabela Vigente | mesmo mês selecionado, por extenso | ex.: `Tabela Vigente: Setembro/2026` |
| PI (número) | — | em branco |
| Data de Compra/Emissão | data atual no momento do export | equivalente ao `=NOW()` do modelo |
| Cliente, Nome Fantasia, Endereço, Bairro, Cidade, UF, CEP, Fone, Fax, CGC/CPF, Insc. Estadual, Nome/Código contato-Ag | — | em branco (caixas vazias) |
| Tabela de títulos (letra + nome) | `titulosUsados` (`computeTitulosUsados(titulos, mapRows)`) | só as letras realmente usadas no mapa; A–F, nunca G |
| Duração (por título usado, e por linha de programa) | a segundagem ativa única (10/15/30, com `"` — ex. `15"`) | mesmo valor em todo o documento |
| Linha "R" da tabela de títulos | — | sempre em branco, com o destaque vermelho do modelo original (fidelidade visual) |
| Cond. Pagamento | texto fixo `15 DFM` | mesmo padrão do modelo original |
| Cond. Negociadas, Observação, Produto, Seg. Mercado, Material | — | em branco |
| SIGLA, PROGRAMA (por linha) | `enrichedRows[i].sigla`, `.programa` | mesmas linhas do mapa (`mapRows`), na mesma ordem |
| OCORRÊNCIA (por linha) | `enrichedRows[i].dias` | já vem pronto no formato `Seg/Ter/Qua/Qui/Sex` |
| DESC.% (por linha) | `descontoPercent` da segundagem ativa | repetido em toda linha preenchida, igual ao exemplo real |
| Marcas dia-a-dia (colunas 1..N do mês) | `row.marks[dia]` | cópia direta — formato já é idêntico ao da PI |
| TOTAL (por linha) | `enrichedRows[i].insercoes` | contagem de inserções já calculada |
| unit (por linha) | `unitValor30`/`unitValor15`/`unitValor10` conforme a segundagem ativa | |
| total (por linha) | `valor30`/`valor15`/`valor10` conforme a segundagem ativa | = unit × TOTAL |
| Valor Tabela | soma dos `total` de todas as linhas (`total30`/`total15`/`total10`) | |
| Desconto | `descontoPercent` da segundagem ativa | mostrado como `X%` |
| Total Mídia | `Valor Tabela × (1 − desconto/100)` | |
| Bruto | igual a Total Mídia | mesma equivalência do modelo (`BA53=BA51`) |
| Reaplicação | — | em branco (campo existe no exemplo real, sem uso conhecido) |
| Assinatura do Cliente / Área Comercial / Agência | — | linhas em branco pra assinatura física |

## Layout visual

Réplica do PDF de exemplo (`PI_FAQUI__SET26.pdf`, página 1), landscape
A4 (297×210mm), estrutura de cima pra baixo:

1. **Cabeçalho**: caixa da praça (canto superior esquerdo) · bloco da
   emissora (logo/nome/endereço/CNPJ, centralizado) · bloco
   Mês Veiculação / PI / Data de Compra-Emissão (canto superior
   direito). Abaixo, faixa amarela "Tabela Vigente: `<mês por
   extenso>/<ano>`".
2. **Bloco cliente**: Cliente (linha larga) + Nome contato/Ag à direita;
   Nome Fantasia + Endereço + Código contato/Ag; Bairro/Cidade/UF/CEP;
   Fone/Fax/CGC-CPF/Insc. Estadual. Todas as caixas vazias.
3. **Tabela de títulos**: colunas Título do comercial / Duração /
   Produto / Seg. Mercado / Material, linhas A–F (só as usadas
   preenchidas) + linha R (sempre vazia, destaque vermelho). Ao lado,
   legenda "Arquivado na Emissora" / "Não arquivado até o momento"
   (texto fixo do modelo, decorativo).
4. **Cond. Pagamento / Cond. Negociadas / Observação**: 3 caixas lado a
   lado — só Cond. Pagamento vem preenchida (`15 DFM`).
5. **Grade de dias**: cabeçalho com número do dia (1..N, N = dias do
   mês) e a letra do dia da semana (`D/S/T/Q/Q/S/S`, domingo primeiro —
   diferente da nossa grade mobile, que começa na segunda). Colunas
   fixas à esquerda: SIGLA, PROGRAMA, OCORRÊNCIA, DESC.%. Colunas fixas
   à direita: TOTAL, Duração, unit, total. Uma linha por programa do
   mapa (`mapRows`, mesma ordem), célula por dia com a marca
   (`row.marks[dia]`) quando existir.
6. **Bloco de valores** (canto inferior direito): Valor Tabela →
   Reaplicação (vazio) → Desconto (`X%`) → Total Mídia → Bruto (em
   negrito).
7. **Assinaturas** (rodapé): 3 caixas com linha — Cliente (com o nome do
   cliente embaixo, vazio), Área Comercial, Agência.

## Implementação

### Componente novo: `PISlide.jsx`

Componente de página única, no mesmo espírito de `MapaInsercoes.jsx`
(landscape, dimensionado pra exportação via `html-to-image`), recebendo
como props os dados já computados por `MidiaAvulsaPage.jsx` (não
recalcula nada, só formata/exibe — mesma divisão de responsabilidade que
`MapaInsercoes.jsx`/`ResumoSlidePage.jsx` já seguem).

Props: `pracaKey`, `pracaLabel`, `monthLabel` (formato longo, ex.
"Setembro/2026"), `monthLabelShort` (ex. "set/26"), `rows`
(`enrichedRows`, já com `sigla/programa/dias/marks/insercoes` e os
`unitValorX`/`valorX` da segundagem ativa escolhida), `titulosUsados`,
`daysInMonth`, `year`, `monthIndex`, `duracaoLabel` (ex. `15"`),
`descontoPercent`, `valorTabela`, `totalMidia`.

### Nova função de utilidade

`weekdayLetterSunFirst(dow)` em `weekLock.js` (ou módulo novo) —
`['D','S','T','Q','Q','S','S']` indexado direto por `Date.getDay()`
(0=domingo), distinto do `WEEKDAY_LETTERS_MONFIRST` já usado no editor
mobile (que é indexado começando na segunda).

### `MidiaAvulsaPage.jsx`

- Computa a segundagem ativa única quando `secondsCards.length === 1`
  (deriva `duracaoLabel`, `descontoPercent`, `valorTabela` = o
  `total30`/`total15`/`total10` correspondente, `totalMidia` = 
  `valorTabela × (1 - descontoPercent/100)`, e usa `unitValorX`/`valorX`
  já presentes em `enrichedRows` pra alimentar as colunas unit/total por
  linha).
- Novo botão "Exportar para PI": mesmo par de posições do botão
  "Exportar PDF" (dentro do popup mobile + botão flutuante desktop).
  Fica desabilitado (visualmente e via `disabled`) quando
  `secondsCards.length !== 1`, com um `title`/tooltip explicando por
  quê ("Ative só uma segundagem pra exportar a PI").
- Ao clicar: renderiza `PISlide` (fora da tela, num `ref` dedicado,
  igual ao padrão de `page1Ref`/`page2Ref`), captura via
  `htmlToImage.toJpeg`, gera um PDF de 1 página landscape (297×210mm)
  via `jsPDF`, e segue o mesmo fluxo de `handleExportPdf` (nome de
  arquivo `PI-<praça>-<mêsano>.pdf`, ex. `PI-rio-verde-set2026.pdf`;
  `navigator.share` com fallback pra `pdf.save()`; tratamento de
  `AbortError` silencioso).
- `duracaoLabel` = número da segundagem ativa + `"` (aspas duplas, igual
  ao exemplo real) — ex. segundagem 15 → `15"`, 30 → `30"`.

## Casos de borda

- **Nenhum programa no mapa**: grade de dias fica vazia, Valor Tabela =
  0 — botão continua habilitado (segundagem única ainda vale), mas o
  PDF sai praticamente em branco. Comportamento aceito, sem tratamento
  especial (mesmo que o "Exportar PDF" já faz hoje).
- **Nenhum título usado** (`titulosUsados` vazio): tabela de títulos sai
  toda vazia (só a linha R em destaque). Aceito.
- **Mês com 31 dias**: grade cresce pra 31 colunas de dia — mesma fonte
  pequena que o modelo original já usa pra caber numa página.
- **Praça diferente de Rio Verde**: bloco da emissora fica em branco
  (decisão explícita, ver Decisões).
- **Duas ou mais segundagens ativas**: botão desabilitado, sem popup de
  escolha (decisão explícita — evita a ambiguidade em vez de resolver).

## Testes

- Util `weekdayLetterSunFirst`: testes unitários (`node --test`) cobrindo
  os 7 dias da semana, igual ao padrão dos outros utils testados no
  projeto.
- Verificação end-to-end via Playwright: gerar a PI com um mapa real
  (siglas verificadas contra os dados carregados, ex. AUTO/BIGB/BOMS),
  confirmar que o botão fica desabilitado com 2 segundagens ativas e
  habilitado com 1, capturar o evento de `download`/`share` real (não
  apenas inspeção visual) e conferir pelo menos um valor calculado
  (Valor Tabela) batendo com a soma esperada.
