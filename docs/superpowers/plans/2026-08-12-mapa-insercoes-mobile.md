# Mapa de Inserções — Edição Mobile por Semana — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `Slide` format of Mídia Avulsa (the Mapa de Inserções grid) a real touch-friendly editing surface on mobile — one week (7 days) at a time, all programs visible, no price columns — instead of forcing the desktop grid + pinch-zoom.

**Architecture:** New pure helper (`computeWeekWindows`) splits the month into Monday-anchored week windows. A new component (`MapaInsercoesSemanal`) renders one week at a time as an editable grid, driven by the exact same state/handlers `MidiaAvulsaPage.jsx` already passes to the desktop `MapaInsercoes` grid — no new data model. The desktop grid stays untouched and becomes the target of an explicit "Ver resumo e exportar" mode (still pinch-zoom navigable, still what `html-to-image`/`jsPDF` capture), reachable from the new mobile editor but not shown by default. Visibility between the two surfaces is CSS-driven (media-query-scoped classes), matching how this app already toggles mobile-only elements — no JS viewport detection.

**Tech Stack:** React 19 + Vite (existing `teste/` app). No test framework is installed and none of the existing components have tests — this plan follows that precedent for UI (manual Playwright verification per task, matching how the recent landscape-breakpoint fix was verified) but adds real unit tests for the new *pure logic* using Node's built-in test runner (`node --test`, zero new dependencies — Node 22 is available).

**Spec:** `docs/superpowers/specs/2026-08-12-mapa-insercoes-mobile-design.md`

## Global Constraints

- Only the `Slide` format changes. `Card` format is untouched (already works on mobile).
- No changes to the shape of `mapRows` / `marks`, or to any handler signature in `MidiaAvulsaPage.jsx` (`handleSetDayMark`, `handleAddMapRow`, `handleDeleteMapRow`, `handleReorderRows`, `handleReplicateWeek`).
- `MapaInsercoes.jsx` (desktop grid) keeps its current visual output exactly — it is still the `html-to-image`/`jsPDF` export target.
- Weeks are Monday-anchored (Seg-Dom), consistent with the existing `isMonday` check in the desktop "repeat week" control.
- Price/`activeSecondsList` columns do not appear in the new mobile editor.
- Reorder on mobile uses ↑/↓ buttons (HTML5 `draggable` does not work on touch) but calls the same `onReorderRows(fromIdx, toIdx)`.
- All new CSS visibility toggling must be scoped inside the existing mobile media query (`@media (max-width: 768px), (max-height: 500px) and (orientation: landscape)` in `teste/src/index.css`) so desktop is provably unaffected.

---

## File Structure

| File | Change |
|---|---|
| `teste/src/utils/weekWindows.js` | **Create.** Pure `computeWeekWindows({ year, monthIndex, daysInMonth })`. |
| `teste/src/utils/weekWindows.test.js` | **Create.** `node:test` coverage using real-calendar fixture months. |
| `teste/src/utils/weekLock.js` | **Modify.** Add exported `normalizeMark` (moved out of `MapaInsercoes.jsx` so mobile and desktop share the exact same validation, instead of two copies drifting apart). |
| `teste/src/utils/weekLock.test.js` | **Create.** `node:test` coverage for `normalizeMark`. |
| `teste/package.json` | **Modify.** Add `"test": "node --test src"` script. |
| `teste/src/components/MapaInsercoes.jsx` | **Modify.** Import `normalizeMark` from `weekLock.js` instead of defining it locally. |
| `teste/src/index.css` | **Modify.** New `.mapa-semanal*` styles + mobile-only visibility classes (`.mobile-slide-editor`, `.mobile-editing-active`). |
| `teste/src/components/MapaInsercoesSemanal.jsx` | **Create.** The new mobile week-grid editor. |
| `teste/src/pages/MidiaAvulsaPage.jsx` | **Modify.** `mobileGridView` state, `sigla` added to `enrichedRows`, `zoomActive` now gated on resumo mode, render wiring, PDF button visibility. |

---

### Task 1: Shared utilities — week windows + shared mark validation

**Files:**
- Create: `teste/src/utils/weekWindows.js`
- Create: `teste/src/utils/weekWindows.test.js`
- Modify: `teste/src/utils/weekLock.js`
- Create: `teste/src/utils/weekLock.test.js`
- Modify: `teste/src/components/MapaInsercoes.jsx:1-28`
- Modify: `teste/package.json`

**Interfaces:**
- Produces: `computeWeekWindows({ year: number, monthIndex: number, daysInMonth: number }) => { days: number[], mondayDay: number | null }[]` — exported from `teste/src/utils/weekWindows.js`. Consumed by Task 3.
- Produces: `normalizeMark(raw: string) => string` — exported from `teste/src/utils/weekLock.js`. Consumed by Task 3 and by the already-existing `MapaInsercoes.jsx`.

- [ ] **Step 1: Write the failing tests for `computeWeekWindows`**

Create `teste/src/utils/weekWindows.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeekWindows } from './weekWindows.js';

// Agosto/2026: dia 1 = sábado, dia 31 = segunda (31 dias). Semana fragmentada
// no início (sáb+dom) e no fim (só a segunda 31).
test('agosto 2026 — fragmentos no início e no fim do mês', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 7, daysInMonth: 31 });
    assert.equal(weeks.length, 6);
    assert.deepEqual(weeks[0], { days: [1, 2], mondayDay: null });
    assert.deepEqual(weeks[1], { days: [3, 4, 5, 6, 7, 8, 9], mondayDay: 3 });
    assert.deepEqual(weeks[2], { days: [10, 11, 12, 13, 14, 15, 16], mondayDay: 10 });
    assert.deepEqual(weeks[3], { days: [17, 18, 19, 20, 21, 22, 23], mondayDay: 17 });
    assert.deepEqual(weeks[4], { days: [24, 25, 26, 27, 28, 29, 30], mondayDay: 24 });
    assert.deepEqual(weeks[5], { days: [31], mondayDay: 31 });
});

// Novembro/2026: dia 1 = domingo, dia 30 = segunda (30 dias). Primeira semana
// é só o domingo 1; última semana é só a segunda 30.
test('novembro 2026 — mês começa no domingo', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 10, daysInMonth: 30 });
    assert.equal(weeks.length, 6);
    assert.deepEqual(weeks[0], { days: [1], mondayDay: null });
    assert.deepEqual(weeks[1], { days: [2, 3, 4, 5, 6, 7, 8], mondayDay: 2 });
    assert.deepEqual(weeks[5], { days: [30], mondayDay: 30 });
});

// Fevereiro/2027: dia 1 = segunda, dia 28 = domingo (28 dias). Encaixa em
// exatamente 4 semanas cheias, sem fragmento nenhum — caso "redondo".
test('fevereiro 2027 — 4 semanas cheias, sem fragmentos', () => {
    const weeks = computeWeekWindows({ year: 2027, monthIndex: 1, daysInMonth: 28 });
    assert.equal(weeks.length, 4);
    assert.deepEqual(weeks[0], { days: [1, 2, 3, 4, 5, 6, 7], mondayDay: 1 });
    assert.deepEqual(weeks[3], { days: [22, 23, 24, 25, 26, 27, 28], mondayDay: 22 });
});

test('toda semana (exceto possivelmente a 1ª) começa numa segunda-feira real', () => {
    const weeks = computeWeekWindows({ year: 2026, monthIndex: 7, daysInMonth: 31 });
    for (let i = 1; i < weeks.length; i++) {
        const firstDay = weeks[i].days[0];
        const dow = new Date(2026, 7, firstDay).getDay();
        assert.equal(dow, 1, `semana ${i} deveria começar numa segunda`);
    }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd teste && node --test src/utils/weekWindows.test.js`
Expected: FAIL — `Cannot find module './weekWindows.js'` (file doesn't exist yet).

- [ ] **Step 3: Implement `computeWeekWindows`**

Create `teste/src/utils/weekWindows.js`:

```js
// Particiona os dias de um mês em janelas de semana ancoradas na segunda-feira
// (Seg-Dom), preservando fragmentos no início/fim do mês (ex.: mês que começa
// numa quinta tem uma 1ª "semana" com só quinta/sexta/sábado/domingo).
// `mondayDay` é o dia-do-mês da segunda-feira daquela janela, ou null quando a
// janela não contém uma segunda dentro do mês (só pode acontecer na 1ª janela).
export function computeWeekWindows({ year, monthIndex, daysInMonth }) {
    const weeks = [];
    let day = 1;
    while (day <= daysInMonth) {
        const dow = new Date(year, monthIndex, day).getDay(); // 0=Dom..6=Sáb
        const isoDow = dow === 0 ? 7 : dow; // 1=Seg..7=Dom
        const daysUntilSunday = 7 - isoDow;
        const weekEnd = Math.min(day + daysUntilSunday, daysInMonth);

        const days = [];
        for (let d = day; d <= weekEnd; d++) days.push(d);

        weeks.push({ days, mondayDay: isoDow === 1 ? day : null });
        day = weekEnd + 1;
    }
    return weeks;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd teste && node --test src/utils/weekWindows.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for `normalizeMark`**

Create `teste/src/utils/weekLock.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMark } from './weekLock.js';

test('normalizeMark: letra minúscula vira maiúscula', () => {
    assert.equal(normalizeMark('a'), 'A');
});

test('normalizeMark: número seguido de letra é preservado', () => {
    assert.equal(normalizeMark('2b'), '2B');
});

test('normalizeMark: caracteres inválidos são removidos', () => {
    assert.equal(normalizeMark('2-b!'), '2B');
});

test('normalizeMark: só aceita 1 letra após os dígitos', () => {
    assert.equal(normalizeMark('2bc'), '2B');
});

test('normalizeMark: string vazia continua vazia', () => {
    assert.equal(normalizeMark(''), '');
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd teste && node --test src/utils/weekLock.test.js`
Expected: FAIL — `normalizeMark` is not exported from `weekLock.js` yet.

- [ ] **Step 7: Move `normalizeMark` into `weekLock.js` and export it**

Modify `teste/src/utils/weekLock.js` — append at the end of the file:

```js

// Normaliza a digitação da marca de inserção: dígitos (quantidade) seguidos de
// no máximo 1 letra maiúscula (código da inserção). Ex.: "2b" -> "2B", "ab" -> "A".
// Compartilhado entre a grade desktop (MapaInsercoes) e a semanal mobile
// (MapaInsercoesSemanal) pra garantir que os dois validam do mesmo jeito.
export function normalizeMark(raw) {
    const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
    const match = cleaned.match(/^(\d*)([A-Z]?)/);
    return match ? match[1] + match[2] : '';
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd teste && node --test src/utils/weekLock.test.js`
Expected: PASS (5 tests).

- [ ] **Step 9: Update `MapaInsercoes.jsx` to import the shared `normalizeMark`**

Modify `teste/src/components/MapaInsercoes.jsx`. Replace lines 1-28 (imports through the local `normalizeMark` definition):

```js
import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Repeat } from 'lucide-react';
import { formatMoney } from '../utils/cardHelpers';
import { normalizeMark } from '../utils/weekLock';
import ResumoSlide from './ResumoSlide';

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom, Seg, Ter, Qua, Qui, Sex, Sáb (getDay() index)
const LABEL_COL = 130;
const HORARIO_COL = 52;
const QTD_COL = 40;
const UNIT_COL = 52;
const TOTAL_COL = 60;

// Fundo dos dias não marcados: mais escuro que o branco da página pra ficar fácil
// de enxergar onde clicar. Fins de semana usam sempre o mesmo laranja translúcido
// (cabeçalho, números do dia e células), pra ler a coluna inteira como um bloco só.
const UNFILLED_WEEKDAY = '#e2e2e9';
const WEEKEND_BG = 'rgba(249,115,22,0.18)';
// Cada segundagem (15s, 30s...) recebe um tom de cinza levemente diferente nas
// colunas de preço, pra não confundir o olho ao "dar zoom out" na tabela.
const GROUP_BG = ['#f7f7f9', '#edeef1'];
```

(This drops the local `normalizeMark` function — everything from `// Normaliza a digitação...` through its closing `};` — and adds the import line. Nothing else in the file changes; `normalizeMark(...)` calls further down keep working unchanged since the name is identical.)

- [ ] **Step 10: Add the `test` script**

Modify `teste/package.json` — add to `"scripts"`:

```json
    "test": "node --test src",
```

- [ ] **Step 11: Run the full test suite and the existing build to confirm nothing broke**

Run: `cd teste && npm test && npm run build`
Expected: `npm test` — 9 tests passing (4 week-window + 5 mark). `npm run build` — succeeds (confirms `MapaInsercoes.jsx`'s new import compiles).

- [ ] **Step 12: Commit**

```bash
git add teste/src/utils/weekWindows.js teste/src/utils/weekWindows.test.js \
        teste/src/utils/weekLock.js teste/src/utils/weekLock.test.js \
        teste/src/components/MapaInsercoes.jsx teste/package.json
git commit -m "feat: extract week-window and mark-validation utilities with tests"
```

---

### Task 2: CSS for the mobile week editor

**Files:**
- Modify: `teste/src/index.css`

**Interfaces:**
- Produces: CSS classes consumed by Task 3 (`.mapa-semanal*`) and Task 4 (`.mobile-slide-editor`, `.mobile-editing-active`).

- [ ] **Step 1: Append the new mobile-editor CSS block**

Modify `teste/src/index.css` — insert this new block right after the existing `@keyframes fadeIn { ... }` block that currently ends the "SLIDE FORMAT ON MOBILE" section (i.e., insert between the closing `}` of the `@media (max-width: 768px) { html.slide-desktop-mode ... }` block and the `@keyframes fadeIn` block — right where the file currently reads `}\n\n@keyframes fadeIn {`):

```css
/* ==============================
   MAPA DE INSERÇÕES — EDITOR SEMANAL MOBILE
   MapaInsercoesSemanal é a superfície de edição em telas pequenas: sempre
   fica escondida por padrão (regra fora de qualquer media query, então
   desktop nunca mostra ela) e só aparece dentro do breakpoint mobile quando
   o estado da página marca ".mobile-editing-active". A grade desktop
   (.slide-scale-wrapper, alvo da exportação de PDF/imagem) faz o caminho
   inverso: continua com seu display normal em todo lugar, e só é escondida
   dentro do breakpoint mobile enquanto o editor semanal está ativo — nunca
   com display:none permanente, porque ela precisa continuar montada e em
   layout normal pra exportação funcionar quando o usuário volta pra ela.
   ============================== */
.mobile-slide-editor {
  display: none;
}

@media (max-width: 768px), (max-height: 500px) and (orientation: landscape) {
  .mobile-slide-editor.mobile-editing-active {
    display: block;
  }

  .slide-scale-wrapper.mobile-editing-active {
    display: none;
  }

  .mobile-copy-btn.mobile-editing-active {
    display: none;
  }
}

.mapa-semanal {
  max-width: 480px;
  margin: 0 auto;
  padding: 0.75rem 0.75rem 6rem;
  font-family: 'Outfit', sans-serif;
  color: var(--text-dark);
}

.mapa-semanal-header {
  text-align: center;
  margin-bottom: 0.75rem;
}

.mapa-semanal-praca {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
}

.mapa-semanal-week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

.mapa-semanal-week-nav span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-dark);
  min-width: 11rem;
}

.mapa-semanal-week-nav button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid #e2e8f0;
  background: white;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mapa-semanal-week-nav button:disabled {
  color: #cbd5e1;
  border-color: #f1f5f9;
  cursor: not-allowed;
}

.mapa-semanal-replicate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.5rem auto 0;
  padding: 0.45rem 0.9rem;
  border-radius: 50px;
  border: 1.5px solid var(--primary);
  background: var(--bg-card);
  color: var(--primary);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
}

.mapa-semanal-dow-row {
  display: grid;
  align-items: center;
  font-size: 0.62rem;
  font-weight: 800;
  color: #94a3b8;
  text-align: center;
  border-bottom: 2px solid var(--primary);
  padding-bottom: 0.3rem;
  margin-bottom: 0.15rem;
}

.mapa-semanal-dow-row > div {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  border-radius: 4px;
  padding: 0.1rem 0;
}

.mapa-semanal-dow-row > div.is-weekend {
  color: #c2570f;
  background: rgba(249, 115, 22, 0.16);
}

.mapa-semanal-row {
  display: grid;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid #f1f5f9;
}

.mapa-semanal-row:nth-child(odd) {
  background: rgba(90, 28, 219, 0.04);
}

.mapa-semanal-sigla {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  overflow: hidden;
}

.mapa-semanal-sigla .reorder-btns {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.mapa-semanal-sigla .reorder-btns button {
  border: none;
  background: none;
  color: #94a3b8;
  padding: 0;
  display: flex;
  cursor: pointer;
}

.mapa-semanal-sigla .reorder-btns button:disabled {
  color: #e2e8f0;
  cursor: not-allowed;
}

.mapa-semanal-sigla .sigla-text {
  min-width: 0;
  overflow: hidden;
  flex: 1;
}

.mapa-semanal-sigla .sigla-text b {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mapa-semanal-sigla .sigla-text small {
  display: block;
  font-size: 0.56rem;
  font-weight: 500;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mapa-semanal-sigla .delete-btn {
  border: none;
  background: none;
  color: #e74c3c;
  padding: 0.2rem;
  flex-shrink: 0;
  display: flex;
  cursor: pointer;
}

.mapa-semanal-cell,
.mapa-semanal-cell-input {
  height: 36px;
  margin: 2px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
}

.mapa-semanal-cell {
  border: none;
  cursor: pointer;
  color: transparent;
  background: #e2e2e9;
  padding: 0;
}

.mapa-semanal-cell.is-weekend {
  background: rgba(249, 115, 22, 0.18);
}

.mapa-semanal-cell.is-marked {
  color: white;
  background: var(--primary);
}

.mapa-semanal-cell.is-locked {
  background: transparent;
  cursor: not-allowed;
}

.mapa-semanal-cell-input {
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  border: 1.5px solid var(--primary);
  padding: 0;
  outline: none;
}

.mapa-semanal-qtd {
  text-align: center;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--primary);
}

.mapa-semanal-add-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
}

.mapa-semanal-add-row input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-family: 'Outfit', sans-serif;
  outline: none;
}

.mapa-semanal-add-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e2e8f0;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mapa-semanal-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 42px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.mapa-semanal-suggestions > div {
  padding: 0.55rem 0.8rem;
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  border-bottom: 1px solid #f1f5f9;
}

.mapa-semanal-suggestions b {
  color: var(--primary);
  min-width: 2.5rem;
}

.mapa-semanal-suggestions span {
  color: #555;
  font-size: 0.82rem;
}

.mapa-semanal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1.5px dashed #e2e8f0;
  font-size: 0.78rem;
  font-weight: 700;
  color: #555;
}

.mapa-semanal-resumo-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 50px;
  border: none;
  background: var(--primary);
  color: white;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.mobile-back-to-editor-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 auto 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 50px;
  border: 1.5px solid var(--primary);
  background: white;
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
```

- [ ] **Step 2: Verify the stylesheet still builds**

Run: `cd teste && npm run build`
Expected: succeeds (no CSS syntax errors).

- [ ] **Step 3: Commit**

```bash
git add teste/src/index.css
git commit -m "feat: add mobile week-editor styles for Mapa de Inserções"
```

---

### Task 3: `MapaInsercoesSemanal` component

**Files:**
- Create: `teste/src/components/MapaInsercoesSemanal.jsx`

**Interfaces:**
- Consumes: `computeWeekWindows` (Task 1, `../utils/weekWindows.js`), `normalizeMark` + `markQuantity` (Task 1, `../utils/weekLock.js`).
- Consumes (props, all already produced today by `MidiaAvulsaPage.jsx` for the desktop grid, plus one new field added in Task 4): `pracaLabel: string`, `monthLabel: string`, `year: number`, `monthIndex: number`, `daysInMonth: number`, `rows: { sigla, programa, horario, allowedWeekdays, marks, insercoes }[]`, `programas: { sigla, programa }[]`, `onSetDayMark(rowIdx, day, markStr)`, `onAddRow(sigla)`, `onDeleteRow(idx)`, `onReorderRows(fromIdx, toIdx)`, `onReplicateWeek(mondayDay)`, `maxRows: number`, `onShowResumo(): void`.
- Produces: default export `MapaInsercoesSemanal` — consumed by Task 4 (`MidiaAvulsaPage.jsx`).

- [ ] **Step 1: Write the component**

Create `teste/src/components/MapaInsercoesSemanal.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Repeat, ArrowRight } from 'lucide-react';
import { normalizeMark, markQuantity } from '../utils/weekLock';
import { computeWeekWindows } from '../utils/weekWindows';

// Seg..Dom, alinhado a uma semana que começa na segunda (diferente de
// MapaInsercoes.jsx, que indexa por getDay() com domingo primeiro).
const WEEKDAY_LETTERS_MONFIRST = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Editor de mapa de inserções pra mobile: mostra 1 semana por vez (todos os
// programas, sem colunas de preço) em vez do mês inteiro. Opera sobre o mesmo
// estado (mapRows) que a grade desktop — é só outra superfície de edição.
const MapaInsercoesSemanal = ({
    pracaLabel,
    monthLabel,
    year,
    monthIndex,
    daysInMonth,
    rows,
    programas,
    onSetDayMark,
    onAddRow,
    onDeleteRow,
    onReorderRows,
    onReplicateWeek,
    maxRows,
    onShowResumo,
}) => {
    const weeks = computeWeekWindows({ year, monthIndex, daysInMonth });
    const [weekIdx, setWeekIdx] = useState(0);

    // Se o mês mudar pra um com menos semanas enquanto uma semana tardia
    // estiver selecionada, volta pra semana 1 em vez de apontar pro nada.
    useEffect(() => {
        if (weekIdx >= weeks.length) setWeekIdx(0);
    }, [weeks.length, weekIdx]);

    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);
    const [editingCell, setEditingCell] = useState(null); // { rowIdx, day } | null
    const [editValue, setEditValue] = useState('');

    const week = weeks[weekIdx] || weeks[0];
    const canReplicate = week.mondayDay != null && week.mondayDay - 7 >= 1;
    const atLimit = rows.length >= maxRows;

    const siglasOptions = programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    const handlePick = (sigla) => {
        onAddRow(sigla);
        setBusca('');
        setBuscaFocused(false);
    };

    const startEdit = (rowIdx, day, currentMark) => {
        setEditingCell({ rowIdx, day });
        setEditValue(currentMark || '');
    };

    const commitEdit = () => {
        if (!editingCell) return;
        const { rowIdx, day } = editingCell;
        const isValid = /^\d*[A-Z]$/.test(editValue);
        onSetDayMark(rowIdx, day, isValid ? editValue : '');
        setEditingCell(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const weekQuantity = (row) => week.days.reduce((sum, d) => sum + markQuantity(row.marks[d]), 0);
    const weekTotalInsercoes = rows.reduce((sum, row) => sum + weekQuantity(row), 0);
    const rowGridTemplate = `92px repeat(${week.days.length}, 1fr) 30px`;

    return (
        <div className="mapa-semanal">
            <div className="mapa-semanal-header">
                <div className="mapa-semanal-praca">{pracaLabel} · {monthLabel}</div>
                <div className="mapa-semanal-week-nav">
                    <button
                        type="button"
                        onClick={() => setWeekIdx(i => Math.max(0, i - 1))}
                        disabled={weekIdx === 0}
                        aria-label="Semana anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span>Semana {weekIdx + 1} de {weeks.length}</span>
                    <button
                        type="button"
                        onClick={() => setWeekIdx(i => Math.min(weeks.length - 1, i + 1))}
                        disabled={weekIdx === weeks.length - 1}
                        aria-label="Próxima semana"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
                {canReplicate && (
                    <button
                        type="button"
                        className="mapa-semanal-replicate-btn"
                        onClick={() => onReplicateWeek(week.mondayDay)}
                    >
                        <Repeat size={14} /> Repetir semana anterior
                    </button>
                )}
            </div>

            <div className="mapa-semanal-dow-row" style={{ gridTemplateColumns: rowGridTemplate }}>
                <div />
                {week.days.map(d => {
                    const dow = new Date(year, monthIndex, d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    const letter = WEEKDAY_LETTERS_MONFIRST[dow === 0 ? 6 : dow - 1];
                    return (
                        <div key={d} className={isWeekend ? 'is-weekend' : ''}>
                            <span>{letter}</span>
                            <span>{d}</span>
                        </div>
                    );
                })}
                <div>QTD</div>
            </div>

            <div className="mapa-semanal-rows">
                {rows.map((row, rowIdx) => (
                    <div key={rowIdx} className="mapa-semanal-row" style={{ gridTemplateColumns: rowGridTemplate }}>
                        <div className="mapa-semanal-sigla">
                            <div className="reorder-btns">
                                <button
                                    type="button"
                                    onClick={() => onReorderRows(rowIdx, rowIdx - 1)}
                                    disabled={rowIdx === 0}
                                    aria-label="Mover programa pra cima"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onReorderRows(rowIdx, rowIdx + 1)}
                                    disabled={rowIdx === rows.length - 1}
                                    aria-label="Mover programa pra baixo"
                                >
                                    <ChevronDown size={12} />
                                </button>
                            </div>
                            <div className="sigla-text" title={row.programa}>
                                <b>{row.sigla}</b>
                                <small>{row.horario}</small>
                            </div>
                            <button
                                type="button"
                                className="delete-btn"
                                onClick={() => onDeleteRow(rowIdx)}
                                aria-label="Remover programa"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        {week.days.map(d => {
                            const dow = new Date(year, monthIndex, d).getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            const locked = row.allowedWeekdays && !row.allowedWeekdays.has(dow);
                            const mark = row.marks[d] || '';
                            const isEditing = editingCell && editingCell.rowIdx === rowIdx && editingCell.day === d;

                            if (locked) {
                                return <div key={d} className="mapa-semanal-cell is-locked" />;
                            }

                            if (isEditing) {
                                return (
                                    <input
                                        key={d}
                                        autoFocus
                                        className="mapa-semanal-cell-input"
                                        value={editValue}
                                        onChange={e => setEditValue(normalizeMark(e.target.value))}
                                        onBlur={commitEdit}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            else if (e.key === 'Escape') cancelEdit();
                                        }}
                                    />
                                );
                            }

                            return (
                                <button
                                    key={d}
                                    type="button"
                                    className={`mapa-semanal-cell${mark ? ' is-marked' : ''}${isWeekend ? ' is-weekend' : ''}`}
                                    onClick={() => startEdit(rowIdx, d, mark)}
                                >
                                    {mark}
                                </button>
                            );
                        })}
                        <div className="mapa-semanal-qtd">{weekQuantity(row)}</div>
                    </div>
                ))}
            </div>

            <div className="mapa-semanal-add-row">
                <input
                    type="text"
                    placeholder={atLimit ? 'Limite de programas atingido' : 'Buscar sigla/programa...'}
                    value={busca}
                    disabled={atLimit}
                    onChange={e => { setBusca(e.target.value); }}
                    onFocus={() => setBuscaFocused(true)}
                    onBlur={() => setTimeout(() => setBuscaFocused(false), 180)}
                />
                <div className="mapa-semanal-add-icon">
                    <Plus size={16} />
                </div>
                {buscaFocused && busca && filteredSiglas.length > 0 && (
                    <div className="mapa-semanal-suggestions">
                        {filteredSiglas.map(p => (
                            <div key={p.sigla} onMouseDown={() => handlePick(p.sigla)}>
                                <b>{p.sigla}</b>
                                <span>{p.programa}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mapa-semanal-footer">
                <span>Semana {weekIdx + 1}: {weekTotalInsercoes} inserções</span>
                <button type="button" className="mapa-semanal-resumo-btn" onClick={onShowResumo}>
                    Ver resumo e exportar <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default MapaInsercoesSemanal;
```

- [ ] **Step 2: Lint the new file**

Run: `cd teste && npx eslint src/components/MapaInsercoesSemanal.jsx`
Expected: no errors. (The component isn't wired into the app yet — Task 4 does that and is where it gets exercised in the browser.)

- [ ] **Step 3: Commit**

```bash
git add teste/src/components/MapaInsercoesSemanal.jsx
git commit -m "feat: add MapaInsercoesSemanal mobile week-grid editor"
```

---

### Task 4: Wire the mobile editor into `MidiaAvulsaPage.jsx`

**Files:**
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx`

**Interfaces:**
- Consumes: `MapaInsercoesSemanal` (Task 3, `../components/MapaInsercoesSemanal`).
- Produces: `mobileGridView` state (`'editar' | 'resumo'`) — local to this file, not consumed elsewhere.

- [ ] **Step 1: Import the new component**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:1-7` — add the import after the existing `MapaInsercoes` import:

```js
import MapaInsercoes from '../components/MapaInsercoes';
import MapaInsercoesSemanal from '../components/MapaInsercoesSemanal';
```

- [ ] **Step 2: Add `mobileGridView` state**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:92-93` — add the new state right after `formato`:

```js
    const [formato, setFormato] = useState('card'); // 'card' | 'slide'
    // No formato slide em mobile: 'editar' mostra o editor semanal novo,
    // 'resumo' mostra a grade desktop (pinça/zoom) pra conferir preço e exportar.
    const [mobileGridView, setMobileGridView] = useState('editar');
    const [mapRows, setMapRows] = useState([]); // [{ sigla, marks: { [day]: string } }] — usado no formato slide
```

- [ ] **Step 3: Reset to 'editar' whenever the format changes**

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — add this new effect right after the `fetchAllSheetData` effect (after the block ending at line 120):

```js
    // Trocar de formato sempre volta o mobile pro modo de edição (em vez de
    // ficar preso no modo resumo de um formato que não está mais visível).
    useEffect(() => {
        setMobileGridView('editar');
    }, [formato]);
```

- [ ] **Step 4: Gate `zoomActive` on the resumo view, not just the slide format**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:122-136`. Replace the whole block:

```js
    // Formato Slide: em telas pequenas, abandona o layout mobile (sidebar em bandeja,
    // mapa reduzido) e força o layout de desktop, navegado via pinça/zoom nativo do
    // navegador — precisão de toque pra editar célula a célula não é viável reduzido.
    useEffect(() => {
        const zoomActive = Boolean(active) && formato === 'slide';
        const meta = document.querySelector('meta[name="viewport"]');
        const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        const ZOOM_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=1';
        if (meta) meta.setAttribute('content', zoomActive ? ZOOM_VIEWPORT : DEFAULT_VIEWPORT);
        document.documentElement.classList.toggle('slide-desktop-mode', zoomActive);
        return () => {
            if (meta) meta.setAttribute('content', DEFAULT_VIEWPORT);
            document.documentElement.classList.remove('slide-desktop-mode');
        };
    }, [active, formato]);
```

with:

```js
    // Formato Slide, modo "editar" (padrão em mobile): usa o editor semanal novo,
    // com o mesmo tratamento mobile normal (sidebar em bandeja, sem pinça forçada).
    // Formato Slide, modo "resumo" (ou desktop, onde isso não faz diferença):
    // continua forçando o layout de desktop navegado por pinça/zoom, porque é
    // onde o usuário confere preço/total e exporta — precisão de toque não é o
    // ponto ali, ver o documento inteiro é.
    useEffect(() => {
        const zoomActive = Boolean(active) && formato === 'slide' && mobileGridView === 'resumo';
        const meta = document.querySelector('meta[name="viewport"]');
        const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        const ZOOM_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=1';
        if (meta) meta.setAttribute('content', zoomActive ? ZOOM_VIEWPORT : DEFAULT_VIEWPORT);
        document.documentElement.classList.toggle('slide-desktop-mode', zoomActive);
        return () => {
            if (meta) meta.setAttribute('content', DEFAULT_VIEWPORT);
            document.documentElement.classList.remove('slide-desktop-mode');
        };
    }, [active, formato, mobileGridView]);
```

- [ ] **Step 5: Add `sigla` to `enrichedRows`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:174-200`. In the `enrichedRows` map, add a `sigla` field to the returned object (it's already available as `row.sigla` — every source row in the `slide` format has it):

```js
    const enrichedRows = sourceRows.map(row => {
        const prog = db.programas.find(p => String(p.sigla).trim() === String(row.sigla).trim()) || {};
        const colKey = selectedMonthOffset ? `${selectedPraca}${selectedMonthOffset}` : selectedPraca;
        const unitValor30 = parseNum(prog[colKey]);
        const valor30 = unitValor30 * row.insercoes;
        const coef15 = parseNum(prog.coeficiente_15);
        const coef10 = parseNum(prog.coeficiente_10);
        // Correct formula: valor - (valor * (1 - coeficiente)) — mesma fórmula aplicada
        // ao valor unitário, pra manter total = unitário × inserções em qualquer segundagem.
        const unitValor15 = unitValor30 - (unitValor30 * (1 - coef15));
        const unitValor10 = unitValor30 - (unitValor30 * (1 - coef10));
        return {
            sigla: row.sigla,
            programa: prog.programa || row.sigla,
            dias: prog.dias || '—',
            allowedWeekdays: getAllowedWeekdays(prog.dias),
            horario: prog.horario || '—',
            insercoes: row.insercoes,
            marks: row.marks || {},
            valor30,
            valor15: unitValor15 * row.insercoes,
            valor10: unitValor10 * row.insercoes,
            unitValor30,
            unitValor15,
            unitValor10,
            audienciaRvd: parseNum(prog.audiencia_rvd),
        };
    });
```

(Only the added `sigla: row.sigla,` line is new; everything else in the block is unchanged — reproduced in full here so the diff is unambiguous.)

- [ ] **Step 6: Render the mobile editor and gate the desktop grid's visibility**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:607-643`. Replace the `formato === 'slide'` branch:

```jsx
                ) : (
                    <div className="slide-scale-wrapper">
                        <div ref={page1Ref}>
                            <MapaInsercoes
                                pracaLabel={pracaLabel}
                                monthLabel={monthLabel}
                                year={mapYear}
                                monthIndex={mapMonthIndex}
                                daysInMonth={mapDaysInMonth}
                                rows={enrichedRows}
                                programas={db.programas}
                                activeSecondsList={secondsCards}
                                onSetDayMark={handleSetDayMark}
                                onAddRow={handleAddMapRow}
                                onDeleteRow={handleDeleteMapRow}
                                onReorderRows={handleReorderRows}
                                onReplicateWeek={handleReplicateWeek}
                                maxRows={MAX_ROWS}
                                compact={useSinglePage}
                                showResumo={useSinglePage}
                                resumoProps={{ totalVisualizacoes, secondsCards, numVisibleCards }}
                            />
                        </div>
                        {!useSinglePage && (
                            <div ref={page2Ref}>
                                <ResumoSlidePage
                                    pracaLabel={pracaLabel}
                                    monthLabel={monthLabel}
                                    year={mapYear}
                                    totalVisualizacoes={totalVisualizacoes}
                                    secondsCards={secondsCards}
                                    numVisibleCards={numVisibleCards}
                                />
                            </div>
                        )}
                    </div>
                )}
```

with:

```jsx
                ) : (
                    <>
                        <div className={`mobile-slide-editor${mobileGridView === 'editar' ? ' mobile-editing-active' : ''}`}>
                            <MapaInsercoesSemanal
                                pracaLabel={pracaLabel}
                                monthLabel={monthLabel}
                                year={mapYear}
                                monthIndex={mapMonthIndex}
                                daysInMonth={mapDaysInMonth}
                                rows={enrichedRows}
                                programas={db.programas}
                                onSetDayMark={handleSetDayMark}
                                onAddRow={handleAddMapRow}
                                onDeleteRow={handleDeleteMapRow}
                                onReorderRows={handleReorderRows}
                                onReplicateWeek={handleReplicateWeek}
                                maxRows={MAX_ROWS}
                                onShowResumo={() => setMobileGridView('resumo')}
                            />
                        </div>
                        <div className={`slide-scale-wrapper${mobileGridView === 'editar' ? ' mobile-editing-active' : ''}`}>
                            {mobileGridView === 'resumo' && (
                                <button
                                    type="button"
                                    className="mobile-back-to-editor-btn"
                                    onClick={() => setMobileGridView('editar')}
                                >
                                    <ArrowLeft size={16} /> Voltar a editar
                                </button>
                            )}
                            <div ref={page1Ref}>
                                <MapaInsercoes
                                    pracaLabel={pracaLabel}
                                    monthLabel={monthLabel}
                                    year={mapYear}
                                    monthIndex={mapMonthIndex}
                                    daysInMonth={mapDaysInMonth}
                                    rows={enrichedRows}
                                    programas={db.programas}
                                    activeSecondsList={secondsCards}
                                    onSetDayMark={handleSetDayMark}
                                    onAddRow={handleAddMapRow}
                                    onDeleteRow={handleDeleteMapRow}
                                    onReorderRows={handleReorderRows}
                                    onReplicateWeek={handleReplicateWeek}
                                    maxRows={MAX_ROWS}
                                    compact={useSinglePage}
                                    showResumo={useSinglePage}
                                    resumoProps={{ totalVisualizacoes, secondsCards, numVisibleCards }}
                                />
                            </div>
                            {!useSinglePage && (
                                <div ref={page2Ref}>
                                    <ResumoSlidePage
                                        pracaLabel={pracaLabel}
                                        monthLabel={monthLabel}
                                        year={mapYear}
                                        totalVisualizacoes={totalVisualizacoes}
                                        secondsCards={secondsCards}
                                        numVisibleCards={numVisibleCards}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
```

(`ArrowLeft` is already imported at the top of this file for the desktop "Início" button, so no new icon import is needed. `MapaInsercoes` is rendered exactly as before — only its wrapping `<div>`'s className changed, and a sibling `.mobile-slide-editor` block was added before it. The "Voltar a editar" button is a sibling of `<div ref={page1Ref}>`, not a descendant, so it's already outside what `handleExportPdf` captures — no `no-export` class needed on it.)

- [ ] **Step 7: Hide the "Baixar PDF" button while the mobile editor is active**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:661-670`. Replace:

```jsx
                    ) : (
                        <button
                            className="mobile-copy-btn"
                            onClick={handleExportPdf}
                            style={{ backgroundColor: isCopied ? 'rgba(10,199,91,0.85)' : '' }}
                            title="Baixar PDF"
                        >
                            {isCopied ? <Check size={22} /> : <FileDown size={22} />}
                        </button>
                    )}
```

with:

```jsx
                    ) : (
                        <button
                            className={`mobile-copy-btn${mobileGridView === 'editar' ? ' mobile-editing-active' : ''}`}
                            onClick={handleExportPdf}
                            style={{ backgroundColor: isCopied ? 'rgba(10,199,91,0.85)' : '' }}
                            title="Baixar PDF"
                        >
                            {isCopied ? <Check size={22} /> : <FileDown size={22} />}
                        </button>
                    )}
```

- [ ] **Step 8: Build to confirm everything compiles**

Run: `cd teste && npm run build`
Expected: succeeds, no errors.

- [ ] **Step 9: Commit**

```bash
git add teste/src/pages/MidiaAvulsaPage.jsx
git commit -m "feat: wire mobile week editor into Mídia Avulsa Slide format"
```

---

### Task 5: End-to-end verification (Playwright)

**Files:** none (verification only — no source changes expected; if this step surfaces a bug, fix it in the file it belongs to and fold that fix into this task's commit).

- [ ] **Step 1: Start the dev server**

Run (background): `cd teste && npm run dev -- --port 5183 --strictPort`

- [ ] **Step 2: Mobile portrait — full edit flow**

Using Playwright (`/opt/pw-browsers/chromium`) at viewport `428x926`, navigate to `http://localhost:5183/executive/teste/`, open "Mídia Avulsa", switch to "Slide" format, and verify:
- The week-grid editor (`.mapa-semanal`) is visible; the old pinch-zoom sidebar/grade are not.
- Adding a program via the search box adds a row.
- Tapping a day cell in week 1, typing "2A", and blurring shows "2A" marked and the week QTD updates.
- Navigating to week 2 (`›`) and marking a different cell works independently of week 1's marks.
- "Repetir semana anterior" is hidden on week 1 (no prior week in the month) and appears from week 2 onward; clicking it on week 2 copies week 1's marks into week 2 and the grid reflects it immediately.
- The ↑ button on the 2nd program row moves it above the 1st (assert row order via the visible sigla text).
- The trash button removes a program.
- Clicking "Ver resumo e exportar" swaps to the desktop grid (pinch-zoom mode); "Voltar a editar" returns to `.mapa-semanal`.

Expected: every assertion above passes. Screenshot each state to `/tmp/claude-0/-home-user-executive/409c77a4-3b14-51c5-868f-47294f419438/scratchpad/verify/` for a final visual read-through.

- [ ] **Step 3: Mobile landscape — same breakpoint check as the earlier fix**

Repeat the "switch to Slide format" check at viewport `926x428` (landscape). Verify `.mapa-semanal` is visible (not the old cut-off desktop layout that motivated this whole feature) and the day cells are tappable-sized (assert bounding box height ≥ 32px via `boundingBox()`).

- [ ] **Step 4: Desktop regression check**

At viewport `1440x900`, open Slide format and verify: `.mapa-semanal` is not in the accessibility tree / has no layout box (`display: none`), the full desktop grid renders exactly as before (same as the pre-existing behavior — spot-check that all day columns for the month are present, not just one week), and the "Baixar PDF" control area renders (unstyled, as it already did pre-change — desktop never used the floating-button styling).

- [ ] **Step 5: PDF export still works from mobile**

At viewport `428x926`, formato Slide, mark at least one insertion, click "Ver resumo e exportar", then click the PDF download button (mock/allow the download or intercept via Playwright's `page.on('download', ...)`) and confirm a PDF is produced (non-zero byte size). This is the regression check that hiding `.slide-scale-wrapper` during "editar" mode never left it unlaid-out at the moment of capture.

- [ ] **Step 6: Fix anything the checks above surface**

If any assertion fails, fix the relevant file (Task 3 or 4's files most likely) and re-run the specific failing check before continuing.

- [ ] **Step 7: Final full-suite check and commit (only if fixes were needed)**

Run: `cd teste && npm test && npm run build`
Expected: PASS / succeeds.

```bash
git add -A
git commit -m "fix: address issues found in mobile week-editor verification pass"
```

(Skip this commit if Step 6 required no changes — the feature is already fully committed by the end of Task 4.)
