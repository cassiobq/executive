# Mapa de Inserções mobile — títulos de campanha, toque rápido e popup de exportação

Data: 2026-08-13
Escopo do app: `teste/` (Vite/React), página `Mídia Avulsa`, formato `Slide`, **editor mobile** (`MapaInsercoesSemanal.jsx`), introduzido na spec/plano de 2026-08-12.

## Contexto

O editor mobile do Mapa de Inserções já deixa marcar dias por semana, com todos
os programas visíveis. Três lacunas de uso real apareceram ao testar:

1. Marcar uma célula exige tocar + digitar, mesmo pro caso mais comum (1
   inserção).
2. A letra da marcação (ex. "2A") é hoje um código livre, sem gestão — mas
   uma PI real pode ter mais de um título/VT rodando na mesma campanha (ex.:
   comercial da campanha em si, um institucional, um de aniversário de loja),
   e cada um precisa de uma letra própria e nomeada.
3. "Ver resumo e exportar" hoje troca a página inteira pro layout desktop
   (sidebar + grade, navegado por pinça/zoom) — criado antes desta spec,
   pesado demais pra só conferir/exportar.

## Decisões (brainstorming)

1. **Título formaliza a letra existente, não é um mapa separado.** O formato
   da marcação (`\d*[A-Z]`, ex. "2A", "C") não muda. O que muda é que a letra
   passa a vir de uma lista nomeada e gerenciada (`titulos`), em vez de livre.
2. **1 título por célula/dia.** Uma célula continua guardando só uma letra —
   não precisa suportar mais de um título no mesmo programa/dia.
3. **Escopo: só o editor mobile.** A grade desktop (`MapaInsercoes.jsx`)
   continua exatamente como está pra edição — digitação livre, sem seletor de
   título, sem toque-rápido. Título é dado da campanha (afeta a exportação
   final, que é compartilhada), não da superfície de edição.
4. **Sem remoção de título.** Só adicionar (letra seguinte fixa: A→B→C...→F,
   limite 6) e renomear. A legenda no PDF só lista títulos com pelo menos uma
   marcação usando aquela letra em algum lugar do mapa atual — título criado
   e não usado não aparece.
5. **Toque rápido:** tocar numa célula **vazia** marca direto com a letra do
   título ativo (sem número — uma letra sozinha já significa quantidade 1,
   como `markQuantity` já interpreta hoje). Número só aparece a partir de 2+
   inserções, exigindo o passo manual (tocar na célula já preenchida abre a
   edição de sempre, digitação livre de quantidade+letra).
6. **Popup de exportação substitui o modo resumo atual.** Em vez de trocar
   a página inteira pro layout desktop (mecanismo `mobileGridView`/
   `slide-desktop-mode` da spec anterior), um overlay fixo mostra só o
   conteúdo que vira PDF (grade + resumo/preços — o mesmo `page1Ref`/
   `page2Ref` de hoje), navegável por pinça/zoom, com um ícone de fechar.
   Isso **substitui e remove** o mecanismo anterior de troca de página
   inteira — não empilha por cima.
7. **Exportar dentro do popup tenta compartilhar nativo** (`navigator.share`
   com o PDF como arquivo), caindo pro download comum se o navegador não
   suportar. Só no popup mobile — desktop mantém o botão de download direto
   que já existe.

## Não-objetivos

- Não adiciona remoção de título.
- Não muda a superfície de edição do desktop (`MapaInsercoes.jsx`) —
  continua sem seletor de título e sem toque-rápido.
- Não muda o formato de `marks` (`{ [day]: "2A" }`) nem os handlers
  existentes (`handleSetDayMark`, `onSetDayMark`, etc.) — título é uma lista
  auxiliar (`titulos`) e um "título ativo" (`tituloAtivo`), não uma
  reestruturação do dado de marcação.
- Não implementa múltiplos títulos por célula/dia.

## Solução

### Dados: `titulos` e `tituloAtivo`

Novo estado em `MidiaAvulsaPage.jsx`, ao lado de `mapRows` (mesmo ciclo de
vida — não reseta ao trocar mês/praça, já que é dado da campanha em
andamento, não do filtro de visualização):

```js
const [titulos, setTitulos] = useState([{ letra: 'A', nome: 'Campanha' }]);
const [tituloAtivo, setTituloAtivo] = useState('A');
```

- `PROXIMA_LETRA_DISPONIVEL = titulos.length < 6 ? LETRAS[titulos.length] : null`
  (`LETRAS = ['A','B','C','D','E','F']`) — usado pelo botão "Adicionar
  título" no dropdown; desabilitado/oculto quando já tem 6.
- Renomear um título existente: atualiza `nome` no array pela `letra`.
- **Derivação da legenda** (usada só na hora de exportar/mostrar o popup):
  `titulosUsados = titulos.filter(t => algumaRowTemMarcaComLetra(t.letra))`
  — varre `mapRows` (todas as semanas, não só a semana visível) procurando
  qualquer `mark` cujo sufixo de letra bata com `t.letra`.

### Editor mobile: seletor de título + toque rápido

Em `MapaInsercoesSemanal.jsx` (recebe `titulos`, `tituloAtivo`,
`onSetTituloAtivo`, `onAddTitulo`, `onRenameTitulo` como novas props vindas
de `MidiaAvulsaPage.jsx`):

- Um seletor no cabeçalho (perto do nome da praça/mês), mostrando
  `{tituloAtivo} — {nomeDoTituloAtivo}`. Tocar abre uma lista: cada título
  existente (tocar seleciona como ativo; um ícone de lápis ao lado abre
  edição inline do nome), e no fim "+ Adicionar título {próximaLetra}"
  (some/desabilita com 6 títulos).
- `startEdit`/click na célula muda: se a célula está **vazia**, chama
  `onSetDayMark(rowIdx, day, tituloAtivo)` direto (sem abrir o input) — a
  marca vira só a letra (ex. `"A"`), sem dígito. Se a célula **já tem uma
  marca**, comportamento inalterado: abre o input de edição (autofoco,
  mesma validação `normalizeMark`/regex de hoje), permitindo digitar
  quantidade+letra livremente (inclusive trocar de título manualmente).

### Popup de exportação (substitui o "modo resumo" atual)

Remove: o estado `mobileGridView`, a classe `mobile-editing-active` nos
elementos que a usam pra esconder/mostrar o editor vs. a grade, o botão
"Voltar a editar", e o gating de `slide-desktop-mode`/viewport-zoom baseado
em `mobileGridView === 'resumo'` — todo esse mecanismo foi construído pra
"trocar a página inteira" e deixa de ser necessário.

Adiciona: um novo estado local simples em `MidiaAvulsaPage.jsx`,
`const [exportPreviewOpen, setExportPreviewOpen] = useState(false)`.

- Botão "Ver resumo e exportar" (no editor mobile) chama
  `setExportPreviewOpen(true)` em vez de mudar `mobileGridView`.
- Enquanto `exportPreviewOpen`, um componente novo `ExportPreviewModal`
  renderiza um overlay `position:fixed; inset:0` (só existe/monta quando
  aberto — sem necessidade de manter fora da tela pra exportação, porque
  agora ele **é** a superfície de onde se exporta) contendo:
  - Um botão de fechar (ícone X, canto superior) → `setExportPreviewOpen(false)`.
  - O mesmo conteúdo de hoje (`<MapaInsercoes ... />` com `page1Ref`, e
    `<ResumoSlidePage />` com `page2Ref` quando `!useSinglePage`), sem
    sidebar/menu ao redor — só esse conteúdo, roable/pinçável.
  - Um botão "Exportar PDF" dentro do popup, que gera o PDF (mesma lógica
    `handleExportPdf` de hoje) e tenta `navigator.share({ files: [pdfFile] })`
    quando `navigator.canShare?.({ files: [pdfFile] })` é `true`; caso
    contrário, cai pro download direto (comportamento atual de
    `handleExportPdf`).
  - Reaproveita a troca de viewport meta (`maximum-scale:5,
    user-scalable:1`) só enquanto o popup está aberto, revertendo ao fechar
    — mas sem a restrição `touch-action: pinch-zoom` de antes (não há mais
    edição célula-a-célula pra proteger ali dentro, então pan de 1 dedo pode
    ficar livre).

### Legenda de títulos no PDF/popup

`MapaInsercoes.jsx` ganha uma nova prop `titulosUsados` (calculada em
`MidiaAvulsaPage.jsx` como descrito acima) e renderiza uma linha pequena
logo abaixo do cabeçalho (MÍDIA AVULSA / PRAÇA X), tipo:
`A — Campanha    C — Aniversário da Loja` — só quando `titulosUsados.length > 0`
(mapas antigos sem título nenhum usado, ou o formato Card, não mostram nada
novo).

### Casos de borda

- Compartilhar sem suporte (`navigator.share` ausente, ou
  `canShare({files})` falso) → cai pro download comum, sem erro visível pro
  usuário.
- Título criado mas nunca usado numa marcação → não aparece na legenda do
  PDF (mas continua disponível no dropdown pra uso futuro).
- Letra presente numa marca mas sem título correspondente na lista (só
  possível se o mapa foi editado pelo desktop com uma letra livre, ou um
  título antigo) → aparece na legenda só com a letra, sem nome.
- Popup aberto e usuário troca de mês/praça pela sidebar (improvável, mas
  possível se a sidebar continuar acessível por baixo — deve ficar
  bloqueada/inacessível enquanto o popup estiver aberto, já que ele é um
  overlay de tela cheia).

### Testes

Playwright, mesma abordagem da spec anterior: criar um título (B —
Institucional), trocar o título ativo, tocar numa célula vazia (confirma
marca só com a letra, sem número), tocar de novo pra editar manualmente
(confirma quantidade+letra), abrir o popup (confirma grade+resumo visíveis,
sem sidebar), fechar com o X (confirma volta pro editor sem perder estado),
e exportar (confirma fallback de download quando `navigator.share` não
está disponível no ambiente de teste headless).
