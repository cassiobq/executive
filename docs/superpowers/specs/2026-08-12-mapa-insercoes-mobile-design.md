# Mapa de Inserções — edição mobile por semana

Data: 2026-08-12
Escopo do app: `teste/` (Vite/React), página `Mídia Avulsa`, formato `Slide`.

## Contexto

`MidiaAvulsaPage.jsx` tem dois formatos de card: `Card` (já funciona bem em
mobile) e `Slide` (o Mapa de Inserções — uma grade programas × dias do mês,
componente `MapaInsercoes.jsx`, usada tanto pra edição quanto como peça
exportada em imagem/PDF via `html-to-image`/`jsPDF`).

Hoje, em telas pequenas (`@media max-width:768px`, recentemente estendido pra
cobrir paisagem em celular também — ver commit "corrige layout mobile em
paisagem"), o formato Slide **não tem versão mobile**: a página força o
layout desktop de 1000px e deixa o usuário navegar por pinça/zoom nativo do
navegador. Funciona, mas não é uma boa experiência pra editar célula a célula
— confirmado pelo usuário mesmo depois do fix de breakpoint de paisagem.

## Problema

Editar o mapa de inserções (marcar quantidade+código por dia, por programa)
pelo celular exige pinçar/dar zoom numa grade desenhada pra desktop. É
lento e impreciso pra tocar em células de ~20-30px.

## Decisões tomadas (brainstorming)

1. **Escopo**: só o formato Slide (Card já está bom). Não mexe no restante
   do app.
2. **Paridade de edição completa**: adicionar/remover programa, marcar cada
   dia, reordenar, replicar semana — tudo que existe hoje no desktop.
3. **Modelo mental**: o usuário preenche **uma semana inteira, com todos os
   programas visíveis**, e replica esse padrão pras semanas seguintes do
   mês — não "um programa inteiro de cada vez".
4. **Unidade de navegação**: a grade mostra **1 semana (7 dias) por vez**,
   com um seletor de semana, em vez do mês inteiro (~28-31 colunas). Resolve
   a rolagem horizontal sem mudar o formato da grade (linhas = programas,
   colunas = dias).
5. **Preço fica fora da tela de edição**: durante a marcação dos dias, preço
   não faz sentido (só importa quando o mapa do mês estiver pronto). Isso
   libera espaço pra manter horário e quantidade na mesma linha, sem precisar
   esconder informação atrás de expand/collapse.

## Não-objetivos

- Não mexe no formato `Card`.
- Não redesenha a tela de resumo (`ResumoSlide`/`ResumoSlidePage`) — ela
  continua sendo alcançada via zoom/pinça como hoje. Pode virar um design
  separado depois, se necessário.
- Não muda o modelo de dados (`mapRows`, `marks`) nem a geração de PDF/imagem.
- Não introduz build de app mobile nativo — continua sendo o mesmo web app,
  só uma superfície de edição diferente em telas pequenas.

## Solução

### Visão geral

Um componente novo, **mobile-only**, que edita o mesmo estado que já existe
em `MidiaAvulsaPage.jsx` (`mapRows`, `handleSetDayMark`, `handleAddMapRow`,
`handleDeleteMapRow`, `handleReorderRows`, `handleReplicateWeek`). Não há
estado paralelo — é só outra superfície de edição sobre o mesmo dado.

A grade desktop (`MapaInsercoes.jsx`) continua existindo sem mudanças de
comportamento — ela é ao mesmo tempo a UI de edição no desktop **e** a peça
capturada por `html-to-image`/`jsPDF` pra exportação. No mobile, ela deixa
de ser a UI visível/interativa, mas continua **renderizada** (fora da tela,
não `display:none`) só pra servir de alvo de captura pro export — o mesmo
truque de opacidade que `App.jsx` já usa pra transição entre páginas
(`position:absolute; opacity:0; pointer-events:none`, nunca desmontada).

```
MidiaAvulsaPage
├── (mobile, formato slide) MapaInsercoesSemanal   ← visível, interativo
└── page1Ref → MapaInsercoes                        ← sempre montado;
                                                        visível no desktop,
                                                        fora da tela no mobile
                                                        (alvo do export)
```

### Novo componente: `MapaInsercoesSemanal.jsx`

Renderizado por `MidiaAvulsaPage.jsx` só quando o formato é `slide` **e** o
breakpoint mobile bate (reaproveita a mesma media query já existente em
`index.css`, via CSS — o componente desktop fica escondido por CSS nesse
breakpoint, não por JS).

**Props**: mesmas que `MapaInsercoes` recebe hoje (`rows` enriquecidas,
`programas`, `daysInMonth`/`year`/`monthIndex`, `onSetDayMark`, `onAddRow`,
`onDeleteRow`, `onReorderRows`, `onReplicateWeek`, `maxRows`) — sem prop de
preço/`activeSecondsList`.

**Seletor de semana**: calcula as semanas do mês (segunda a domingo,
consistente com a lógica de `isMonday` já usada em `handleReplicateWeek`),
incluindo semanas parciais no início/fim do mês (só os dias que existem
naquele mês aparecem como coluna — sem coluna fantasma). UI: abas ou
setas ("‹ Sem 2 de 5 ›"), estado local (`selectedWeekIdx`), não precisa
persistir.

**Linha do programa** (por semana selecionada): sigla + nome pequeno embaixo
(truncado), horário, 7 células de dia (alvo de toque ~32-36px), quantidade
total do programa naquela semana. Sem colunas de preço.

**Edição de célula**: toque abre o mesmo input inline que existe hoje
(autofocus, mesma normalização/validação de `normalizeMark` — dígitos +
1 letra maiúscula). Dias fora de `allowedWeekdays` do programa continuam
bloqueados (mesmo tratamento visual que hoje: célula não clicável).

**Replicar semana**: botão visível por semana (quando existe semana anterior
dentro do mês) chamando o `onReplicateWeek` já existente — que já replica
pra todos os programas de uma vez, então nenhuma mudança na lógica, só na
forma de expor o botão (grande, com texto, em vez do ícone pequeno de hoje).

**Adicionar programa**: mesmo padrão de busca+seleção por sigla que já existe
(`onAddRow`), touch-friendly (campo maior).

**Reordenar programa**: troca o `draggable` HTML5 atual (que não funciona em
touch) por botões ↑/↓ em cada linha no mobile, chamando o mesmo
`onReorderRows(fromIdx, toIdx)` que já existe — sem mudança de lógica, só a
UI de disparo.

**Remover programa**: mesmo botão de lixeira que já existe.

**Acesso ao resumo**: botão "Ver resumo" (ação explícita, não automática)
que leva à visualização atual do formato Slide (zoom/pinça, sem mudança) pra
conferir preço/total antes de exportar.

### Fluxo de dados

Nenhuma mudança no formato de `mapRows`/`marks` ou nos handlers em
`MidiaAvulsaPage.jsx`. `MapaInsercoesSemanal` é uma view pura sobre o mesmo
estado, do mesmo jeito que `MapaInsercoes` é hoje — só filtra/particiona os
dias por semana antes de renderizar.

### Casos de borda

- Mês com semana parcial no início (ex.: dia 1 cai numa quinta) ou fim (ex.:
  dia 30 cai numa terça): a semana mostra só os dias que existem, sem
  colunas vazias fantasma.
- Trocar de mês (`selectedMonthOffset`) enquanto uma semana intermediária
  está selecionada: se o índice de semana não existir no novo mês (mês com
  menos semanas), volta pra semana 1 — mesmo padrão do `useEffect` que já
  limpa marcações de dias inexistentes ao trocar de mês.
- Programa sem `allowedWeekdays` (sem restrição): todos os 7 dias da semana
  ficam abertos pra marcação, como hoje.
- Atingir `MAX_ROWS` (13 programas): mesmo bloqueio de "adicionar" que já
  existe no desktop.

### Testes

- Testar manualmente em viewport de celular (retrato e paisagem, usando o
  breakpoint já validado) com Playwright: adicionar programa, marcar dias em
  2+ semanas diferentes, replicar semana, reordenar via ↑/↓, remover
  programa, confirmar que o total de inserções bate com o que a tela de
  resumo mostra.
- Confirmar que a exportação de PDF (`handleExportPdf`) continua gerando o
  mesmo resultado de hoje quando disparada a partir do mobile (a grade
  desktop escondida precisa estar corretamente montada/laid-out no momento
  da captura).
