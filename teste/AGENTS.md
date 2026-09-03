# AGENTS.md — Contexto para IAs (`teste/`)

Este é um app **independente** dentro do mesmo repositório do `executive`
(app raiz). Mesmo código-base original (fork do app raiz), e é aqui que a
funcionalidade **Mídia Avulsa → Slide** (mapa de inserções com editor
mobile, títulos, exportar PDF e PI) foi construída.

- **Este app** (`/executive/teste/`, pasta `teste/`): a área de
  experimentação — features novas entram por aqui.
- **App raiz** (`/executive/`, pasta `src/` na raiz do repo): a versão de
  produção. Desde o commit `5f2e313` o `src/` da raiz recebeu todo o
  conteúdo do `teste/src/`, então hoje os dois têm as mesmas telas.

Eles **não se sincronizam sozinhos**: ao mexer numa feature que existe
nos dois, decida conscientemente se a mudança vai só aqui ou nos dois
lugares (as últimas foram aplicadas nos dois).

Os dois são publicados juntos pelo mesmo workflow
(`.github/workflows/deploy.yml`, na raiz do repo): builda `src/` → `site/`
e `teste/` → `site/teste/`, e sobe os dois no mesmo deploy do GitHub
Pages. **Não existe deploy separado para `teste/`** — qualquer push em
`main` reconstrói e publica ambos.

## O que é o app (igual ao raiz, ver `../AGENTS.md` para a base)

PWA React/Vite para gerar cards e mapas de inserção para propostas de
patrocínio de TV (TV Anhanguera, praça Rio Verde). Ver `../AGENTS.md`
para stack, fórmula de preço e estrutura de dados do Google Sheets — é
tudo idêntico aqui, só a página **Mídia Avulsa** diverge de verdade.

## Mídia Avulsa: Card vs Slide

`src/pages/MidiaAvulsaPage.jsx` tem um toggle `formato: 'card' | 'slide'`
(estado `formato`, linha ~94):

- **Card**: comportamento herdado do app raiz — sidebar com table builder,
  1–3 cards de preço.
- **Slide**: exporta 2 páginas paisagem em PDF — página 1 é o card de
  preço reflowed, página 2 é o **Mapa de Inserções** (grade mensal por
  programa × dia, com marcações de inserção). As "inserções" de cada
  linha, nesse formato, são **derivadas** da soma das marcas no mapa
  (não digitadas manualmente).

### Desktop vs mobile — dois componentes diferentes para o mesmo mapa

O breakpoint mobile é definido em `src/index.css`, usado consistentemente
em todo o app (não há detecção de viewport em JS, exceto um
`window.matchMedia` pontual — ver abaixo):

```css
@media (max-width: 768px), (max-height: 500px) and (orientation: landscape)
```

- **`src/components/MapaInsercoes.jsx`** — grade mensal completa, usada
  para: (a) renderização desktop normal, e (b) o conteúdo que vira a
  imagem/PDF exportado em qualquer tamanho de tela (via `page1Ref`).
- **`src/components/MapaInsercoesSemanal.jsx`** — editor **mobile**, uma
  semana por vez, tocar numa célula preenche/edita. É o que aparece na
  tela em telas pequenas/paisagem; nunca é o que vira a exportação.
  A troca de semana é um **carrossel horizontal em CSS scroll-snap**
  (`scroll-snap-type: x mandatory` no trilho, `scroll-snap-align: start`
  em cada painel): todas as semanas são renderizadas lado a lado e o
  usuário rola com o dedo. O JS só observa (`handleWeeksScroll`, com
  debounce de 120ms → `computeActiveWeekIndex` em `utils/weekWindows.js`)
  pra saber qual semana está ativa, e comanda (`goToWeek`, `scrollTo`
  suave) quando as setas são usadas. Nada de arrastar em JS — quem
  anima é o navegador.

### Sistema de "títulos" de campanha

Uma PI pode ter mais de um título/VT (ex.: campanha "A" e campanha "B"
rodando junto). `src/utils/titulos.js`:

- `LETRAS_TITULO = ['A','B','C','D','E','F']` — letras fixas, nessa ordem
  (padrão das PI's da emissora).
- `getNextTituloLetter(titulos)` — próxima letra livre.
- `computeTitulosUsados(titulos, mapRows)` — filtra só os títulos que
  têm pelo menos uma marca no mapa (títulos criados mas não usados não
  aparecem na legenda do PDF).

Estado em `MidiaAvulsaPage.jsx`: `titulos` (lista `{letra, nome}`,
começa com `[{letra:'A', nome:'Campanha'}]`) e `tituloAtivo` (letra
selecionada no momento). No editor mobile
(`MapaInsercoesSemanal.jsx`), tocar numa célula **vazia** preenche
direto com a letra do título ativo (sem teclado); tocar numa célula **já
preenchida** abre edição manual. Formato de marca:
`\d*[A-Z]` (ex. `"2A"`, `"C"`) — dígito = quantidade (letra sozinha
implica quantidade 1, ver `markQuantity()` em `src/utils/weekLock.js`),
letra maiúscula final = o título.

### Popup de exportação (mobile)

Antigo "modo resumo" em tela cheia foi substituído por um popup
(`.slide-scale-wrapper.export-preview-open` em `index.css`) — mostra só
o mapa, com zoom por pinça, botão de fechar e botão de exportar PDF que
aciona `navigator.share()` (compartilhamento nativo do celular), com
fallback para `pdf.save()` quando share não existe ou falha (exceto
`AbortError`, que é cancelamento do usuário e não mostra erro).

O botão flutuante de exportar (`.mobile-copy-btn`, fora do popup) usa
`window.matchMedia(...)` com a mesma string do breakpoint acima, em
`handleExportPdf`'s caller, para decidir: mobile → abre o popup;
desktop → baixa o PDF direto (é o único lugar do app com detecção de
viewport em JS — todo o resto do split desktop/mobile é CSS puro).

### Exportar para PI (Pedido de Inserção)

Além do "Exportar PDF", o formato Slide tem **"Exportar para PI"**: pega
o mapa montado e devolve o `.xlsx` real da emissora já preenchido.
Clicar no botão não exporta na hora — abre o dialog **"Dados do
cliente"** (`piClienteDialogOpen` em `MidiaAvulsaPage.jsx`), que pede um
CNPJ opcional antes de gerar o arquivo:

- **"Buscar e exportar"** consulta a BrasilAPI (`src/utils/cnpj.js` —
  `fetchCnpjData`, pública, sem chave, CORS liberado, chamada direto do
  navegador) e preenche os dados de cliente que a Receita Federal tiver;
  erro (CNPJ inválido, não encontrado, falha de rede) aparece inline no
  dialog, sem fechar nem bloquear.
- **"Pular e exportar"** mantém o comportamento original: exporta sem
  dados de cliente.

`runExportPI(cliente)` é quem de fato gera o arquivo (o antigo
`handleExportPI`, agora recebendo o cliente — ou `null` — como
parâmetro).

O template em branco vive em `public/pi-template.xlsx` (byte a byte igual
ao arquivo que o usuário enviou) e é servido como asset estático. Um
`.xlsx` é um ZIP de XMLs: abrimos com `jszip` (import dinâmico),
trocamos o conteúdo de células que já existem em
`xl/worksheets/sheet1.xml` (`src/utils/piXlsx.js`) e re-empacotamos.
Nenhuma biblioteca de planilha faz round-trip — exceljs foi tentado e
descartado por perder partes do arquivo.

**A regra que não se quebra** (definida pelo usuário, é o contrato desta
feature): o app escreve **apenas** células de entrada — a grade de
programas (linhas 32–47: sigla, programa, ocorrência, desconto por linha,
marcas dia a dia, duração, valor unitário), mês de veiculação (`AH4`),
desconto global (`BA50`), o bloco de títulos (nome + duração, `B16:B21` /
`O16:O21`) e, só quando o CNPJ resolve, o bloco de dados de cliente
(linhas 6–13 — ver mapeamento completo no spec). Praça (`A3`) continua
fora. E **nenhuma célula de fórmula é tocada** — nem o texto da fórmula,
nem o `<v>` com o resultado em cache. Apagar esse cache foi tentado e é o
que quebra: numa matriz dinâmica (`<f t="array">` + `cm="1"`) o valor em
cache descreve o intervalo derramado, e sem ele o Excel rebaixa a fórmula
pra CSE (`{}` na barra) e dá `#NOME?`.

A **única** coisa que o export toca fora da aba é o `<calcPr>` do
`xl/workbook.xml`, onde marca `fullCalcOnLoad="1"` (helper
`forceFullCalc`). Sem isso o Excel abre confiando no `calcChain` e nos
zeros em cache do modelo vazio e **não calcula nada** — e como a aba tem
`showZeros="0"`, a coluna TOTAL aparece vazia, sem erro; qualquer edição
do usuário destrava. `calcPr` é configuração de cálculo do documento, não
uma fórmula.

Detalhe conhecido, **do modelo e não do nosso código**: a contagem usa
`MAP`/`LAMBDA`, que Excel antigo não conhece — lá ela vira
`{=SOMA(_xlfn.MAP(...))}` com `#NOME?`, inclusive no arquivo original.
Excel Web avalia normal.

O botão fica **bloqueado** com mais de uma segundagem ativa (é ela que
define duração/valor do documento inteiro); usa a classe `is-blocked` em
vez do atributo `disabled`, porque `disabled` engoliria o toque e o
`alert` explicativo nunca apareceria.

**Programa e ocorrência são formatados só na hora de escrever.**
`programas.json` guarda o nome em caixa alta (é assim que cards e
sidebar mostram) e o campo `dias` usa notação de intervalo (`"Seg/Sex"`
= segunda a sexta) — a PI real espera nome em título e todos os dias por
extenso, então `fillPiSheet` converte no momento de escrever, sem tocar
no dado original: `formatNomePrograma` (título, preservando siglas como
`TV`/`BBB` e numerais romanos como `NOVELA II`/`III`) e
`expandDiasField`, em `weekLock.js` (reaproveita `getAllowedWeekdays`,
que já trava dias fora do padrão no mapa).

**Nome do arquivo**: `PI <identificador> - <MÊS><ANO>.xlsx`
(`buildPiFileName` em `piXlsx.js`), ex. `PI SUPERMERCADO BARATÃO -
SET2026.xlsx`. O identificador é o nome fantasia do cliente quando o
CNPJ foi consultado; sem CNPJ, cai pra praça.

Ver `../docs/superpowers/specs/2026-08-25-exportar-pi.md` para o
mapeamento completo de células e o histórico das abordagens
descartadas.

## Utils com testes (`node --test`)

- `src/utils/weekWindows.js` — calcula as "semanas" do mês para o
  editor mobile (semanas parciais no início/fim do mês).
- `src/utils/weekLock.js` — `getAllowedWeekdays`, `markQuantity`,
  `normalizeMark` (parsing/validação do formato de marca).
- `src/utils/titulos.js` — ver acima.
- `src/utils/piXlsx.js` — escrita cirúrgica no XML da PI (ver acima). O
  teste `piXlsx.test.js` é o que guarda o contrato: afirma que as células
  de fórmula vizinhas saem byte a byte iguais.
- `src/utils/cnpj.js` — máscara, formatação e consulta de CNPJ
  (`fetchCnpjData`, contra a BrasilAPI) pro dialog de dados do cliente.
  `fetchCnpjData` é testado com `fetch` mockado, sem depender de rede
  real.

Rodar: `npm test` (usa `node --test src/**/*.test.js` — **não** use
`node --test src` sozinho, falha com MODULE_NOT_FOUND nesse projeto).

## Convenções de desenvolvimento deste app

Este subprojeto foi desenvolvido usando os skills do plugin
`superpowers` (brainstorming → spec → plano → subagent-driven-development
→ finishing-a-development-branch). Specs e planos ficam em
`../docs/superpowers/` (raiz do repo, não dentro de `teste/`):

- `docs/superpowers/specs/2026-08-12-mapa-insercoes-mobile-design.md` +
  `docs/superpowers/plans/2026-08-12-mapa-insercoes-mobile.md` — editor
  semanal mobile (base do `MapaInsercoesSemanal.jsx`).
- `docs/superpowers/specs/2026-08-13-titulos-toque-rapido-popup-export.md` +
  `docs/superpowers/plans/2026-08-13-titulos-toque-rapido-popup-export.md`
  — sistema de títulos, toque rápido, popup de exportação.
- `docs/superpowers/specs/2026-08-25-exportar-pi.md` — exportar para PI
  (sem plano formal: a feature foi convergindo a partir do feedback do
  usuário, e o spec foi reescrito no fim pra registrar o que ficou de
  pé).

Ambos os planos foram totalmente implementados, revisados (por tarefa +
revisão final de todo o branch) e mergeados na `main` (PRs #1 e #2).

## Rodar Localmente

```bash
cd teste
npm install
npm run dev
# → http://localhost:5173/executive/teste/ (a porta real pode variar se 5173 estiver ocupada)
```

## Verificação em navegador mobile real

O deploy publica em `https://cassiobq.github.io/executive/teste/` — é
essa URL que reflete o estado atual do app para teste em celular real
(não a raiz `/executive/`, que é o app mais simples).
