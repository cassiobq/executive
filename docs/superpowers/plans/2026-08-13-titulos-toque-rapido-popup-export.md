# Títulos de Campanha, Toque Rápido e Popup de Exportação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Mídia Avulsa mobile editor, formalize the marking letter into a managed list of named campaign "títulos" (with a picker that drives one-tap marking of empty cells), and replace the old full-page "modo resumo" with a lightweight popup for reviewing/exporting the map, sharing the PDF via the phone's native share sheet.

**Architecture:** Título data (`titulos`, `tituloAtivo`) is new state in `MidiaAvulsaPage.jsx`, following the same lifecycle as `mapRows` — no change to the mark data shape (`"2A"` stays `"2A"`). A new pure `titulos.js` utility computes the next available letter and which títulos are actually used (for the export legend). The old `mobileGridView`/`slide-desktop-mode`-on-resumo mechanism (full-page layout switch) is removed outright and replaced by a much simpler `exportPreviewOpen` boolean driving a fixed full-screen popup that reuses the existing desktop `MapaInsercoes` grid as its content — no new "preview" component needed, no off-screen-render tricks, since export now only ever happens while the popup (and therefore `page1Ref`) is mounted and visible.

**Tech Stack:** React 19 + Vite (`teste/` app). Same no-framework-for-UI, `node --test`-for-pure-logic precedent as the previous mobile-editor plan. Adds the browser-native Web Share API (`navigator.share`/`navigator.canShare`) — no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-08-13-titulos-toque-rapido-popup-export.md`

## Global Constraints

- Mark format (`\d*[A-Z]`, e.g. `"2A"`, `"C"`) does not change. Título formalizes the letter's meaning; it does not restructure `marks`.
- One título per cell/day — no multi-título cells.
- Título management (picker, add, rename) and tap-to-fill are **mobile-editor only** (`MapaInsercoesSemanal.jsx`). The desktop grid (`MapaInsercoes.jsx`) keeps free-typing, no picker, no tap-to-fill, exactly as it works today.
- No título removal. Up to 6 títulos (`A`–`F`), next letter is always fixed in that order.
- The export legend lists only títulos with ≥1 mark using that letter anywhere in `mapRows` (all weeks) — created-but-unused títulos are omitted; a letter used in a mark with no matching título entry shows as a bare letter, no name.
- The export/share popup is mobile-only. Desktop keeps its current inline grid + direct-download button, unchanged.
- Tapping an **empty** cell marks it with just the active título's letter (no leading digit — a bare letter already means quantity 1, per the existing `markQuantity` behavior). Tapping an **already-marked** cell opens the existing manual edit input, unchanged.

---

## File Structure

| File | Change |
|---|---|
| `teste/src/utils/titulos.js` | **Create.** Pure `getNextTituloLetter`, `computeTitulosUsados`, `LETRAS_TITULO`. |
| `teste/src/utils/titulos.test.js` | **Create.** `node:test` coverage. |
| `teste/src/components/MapaInsercoesSemanal.jsx` | **Modify.** Título picker UI, tap-to-fill on empty cells. |
| `teste/src/pages/MidiaAvulsaPage.jsx` | **Modify.** Título state/handlers; removes `mobileGridView`/`slide-desktop-mode`-resumo mechanism; adds `exportPreviewOpen` popup; adds native share to `handleExportPdf`. |
| `teste/src/components/MapaInsercoes.jsx` | **Modify.** `titulosUsados` prop + legend row under the header. |
| `teste/src/index.css` | **Modify.** Removes the `slide-desktop-mode` block, the old dead `.slide-scale-wrapper` mobile scale rule, and `.mobile-back-to-editor-btn`; adds popup overlay styles and título picker styles. |

---

### Task 1: `titulos.js` — next-letter and used-títulos utilities

**Files:**
- Create: `teste/src/utils/titulos.js`
- Create: `teste/src/utils/titulos.test.js`

**Interfaces:**
- Produces: `LETRAS_TITULO: string[]` (`['A','B','C','D','E','F']`), `getNextTituloLetter(titulos: {letra,nome}[]) => string | null`, `computeTitulosUsados(titulos: {letra,nome}[], mapRows: {marks: object}[]) => {letra, nome: string|null}[]` — all exported from `teste/src/utils/titulos.js`. Consumed by Task 2 (`getNextTituloLetter`, in `MapaInsercoesSemanal.jsx`) and Task 3 (`computeTitulosUsados`, in `MidiaAvulsaPage.jsx`).

- [ ] **Step 1: Write the failing tests**

Create `teste/src/utils/titulos.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextTituloLetter, computeTitulosUsados, LETRAS_TITULO } from './titulos.js';

test('getNextTituloLetter: com 1 título (A), a próxima é B', () => {
    assert.equal(getNextTituloLetter([{ letra: 'A', nome: 'Campanha' }]), 'B');
});

test('getNextTituloLetter: com 5 títulos, a próxima é F (a última permitida)', () => {
    const titulos = ['A', 'B', 'C', 'D', 'E'].map(letra => ({ letra, nome: '' }));
    assert.equal(getNextTituloLetter(titulos), 'F');
});

test('getNextTituloLetter: com os 6 títulos (A-F), não há mais próxima', () => {
    const titulos = LETRAS_TITULO.map(letra => ({ letra, nome: '' }));
    assert.equal(getNextTituloLetter(titulos), null);
});

test('computeTitulosUsados: título usado em pelo menos 1 marca aparece na legenda', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 3: 'A', 5: '2A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'A', nome: 'Campanha' }]);
});

test('computeTitulosUsados: título criado mas nunca usado não aparece', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }, { letra: 'B', nome: 'Institucional' }];
    const mapRows = [{ marks: { 3: 'A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'A', nome: 'Campanha' }]);
});

test('computeTitulosUsados: varre todas as linhas do mapa, não só a primeira', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }, { letra: 'B', nome: 'Institucional' }];
    const mapRows = [{ marks: { 3: 'A' } }, { marks: { 10: '3B' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [
        { letra: 'A', nome: 'Campanha' },
        { letra: 'B', nome: 'Institucional' },
    ]);
});

test('computeTitulosUsados: letra usada sem título correspondente aparece só com a letra', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 3: '2C' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [{ letra: 'C', nome: null }]);
});

test('computeTitulosUsados: resultado sempre em ordem A→F, independente da ordem em titulos', () => {
    const titulos = [{ letra: 'C', nome: 'Aniversário' }, { letra: 'A', nome: 'Campanha' }];
    const mapRows = [{ marks: { 1: 'C' } }, { marks: { 2: 'A' } }];
    assert.deepEqual(computeTitulosUsados(titulos, mapRows), [
        { letra: 'A', nome: 'Campanha' },
        { letra: 'C', nome: 'Aniversário' },
    ]);
});

test('computeTitulosUsados: sem marcações, legenda vazia', () => {
    const titulos = [{ letra: 'A', nome: 'Campanha' }];
    assert.deepEqual(computeTitulosUsados(titulos, []), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd teste && node --test src/utils/titulos.test.js`
Expected: FAIL — `Cannot find module './titulos.js'`.

- [ ] **Step 3: Implement `titulos.js`**

Create `teste/src/utils/titulos.js`:

```js
// Letras de título permitidas numa PI, na ordem fixa em que são atribuídas
// (a próxima "adicionar título" é sempre a seguinte nessa lista).
export const LETRAS_TITULO = ['A', 'B', 'C', 'D', 'E', 'F'];

// Próxima letra disponível pra um novo título, ou null quando os 6 já existem.
export function getNextTituloLetter(titulos) {
    if (titulos.length >= LETRAS_TITULO.length) return null;
    return LETRAS_TITULO[titulos.length];
}

// Títulos com pelo menos 1 marcação em algum lugar do mapa (todas as linhas,
// não só a semana visível) — usado pra montar a legenda exportada, que não
// deve listar título criado e nunca usado. Uma letra marcada sem título
// correspondente (ex.: mapa editado pelo desktop com uma letra livre) ainda
// aparece, só sem nome — por isso a varredura é por letra usada, não pelos
// títulos cadastrados.
export function computeTitulosUsados(titulos, mapRows) {
    const letrasUsadas = new Set();
    for (const row of mapRows) {
        for (const mark of Object.values(row.marks || {})) {
            const match = String(mark).match(/[A-Z]$/);
            if (match) letrasUsadas.add(match[0]);
        }
    }
    return LETRAS_TITULO
        .filter(letra => letrasUsadas.has(letra))
        .map(letra => titulos.find(t => t.letra === letra) || { letra, nome: null });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd teste && node --test src/utils/titulos.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Run the full suite and build**

Run: `cd teste && npm test && npm run build`
Expected: `npm test` — 18 tests passing (9 existing + 9 new). `npm run build` succeeds.

- [ ] **Step 6: Commit**

```bash
git add teste/src/utils/titulos.js teste/src/utils/titulos.test.js
git commit -m "feat: add título next-letter and used-títulos utilities with tests"
```

---

### Task 2: Título picker + tap-to-fill in the mobile editor

**Files:**
- Modify: `teste/src/components/MapaInsercoesSemanal.jsx`
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx:1-8` (imports), `:85-97` (state), `:213-240` (unrelated — do not touch; only the props passed to `MapaInsercoesSemanal` change)

**Interfaces:**
- Consumes: `getNextTituloLetter` (Task 1, `../utils/titulos`).
- Produces: `MapaInsercoesSemanal` gains 5 new props — `titulos: {letra, nome}[]`, `tituloAtivo: string`, `onSetTituloAtivo(letra: string): void`, `onAddTitulo(letra: string): void`, `onRenameTitulo(letra: string, novoNome: string): void`. Consumed by Task 3 and 4 (`MidiaAvulsaPage.jsx` passes these; no further tasks add to this list).
- Produces: `MidiaAvulsaPage.jsx` gains state `titulos`, `tituloAtivo` and handlers `handleAddTitulo`, `handleRenameTitulo` — consumed by Task 3 (`computeTitulosUsados(titulos, mapRows)`).

- [ ] **Step 1: Add título state and handlers to `MidiaAvulsaPage.jsx`**

This task adds no new import to `MidiaAvulsaPage.jsx` — every icon/util it needs
(`useState`, `MapaInsercoesSemanal`) is already imported. Later tasks each add
exactly the one import they introduce (Task 3 adds `computeTitulosUsados`,
Task 4 adds the `X` icon) at the point they're first used, so no task ever
commits an unused import.

Modify `teste/src/pages/MidiaAvulsaPage.jsx:93-97` — add título state right after `formato`, replacing `mobileGridView` (this task only *adds* `titulos`/`tituloAtivo`; the removal of `mobileGridView` and its effect happens in Task 4, since Task 4 is what deletes the mechanism that reads it — leave `mobileGridView` and its effect exactly as-is for this task):

```js
    const [formato, setFormato] = useState('card'); // 'card' | 'slide'
    // No formato slide em mobile: 'editar' mostra o editor semanal novo,
    // 'resumo' mostra a grade desktop (pinça/zoom) pra conferir preço e exportar.
    const [mobileGridView, setMobileGridView] = useState('editar');
    const [titulos, setTitulos] = useState([{ letra: 'A', nome: 'Campanha' }]);
    const [tituloAtivo, setTituloAtivo] = useState('A');
    const [mapRows, setMapRows] = useState([]); // [{ sigla, marks: { [day]: string } }] — usado no formato slide
```

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — add the two handlers right after `handleReplicateWeek` (after the block ending at line 327, before `const toggleSeconds = ...`):

```js
    const handleAddTitulo = (letra) => {
        setTitulos(prev => [...prev, { letra, nome: '' }]);
    };

    const handleRenameTitulo = (letra, novoNome) => {
        setTitulos(prev => prev.map(t => (t.letra === letra ? { ...t, nome: novoNome } : t)));
    };
```

- [ ] **Step 2: Pass the new props to `MapaInsercoesSemanal`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:650-665` (the `<MapaInsercoesSemanal ... />` call). Add 5 props right before `onShowResumo`:

```jsx
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
                                titulos={titulos}
                                tituloAtivo={tituloAtivo}
                                onSetTituloAtivo={setTituloAtivo}
                                onAddTitulo={handleAddTitulo}
                                onRenameTitulo={handleRenameTitulo}
                                onShowResumo={() => setMobileGridView('resumo')}
                            />
```

(`onShowResumo`'s implementation is untouched here — Task 4 changes what it does.)

- [ ] **Step 3: Add the título picker UI and tap-to-fill to `MapaInsercoesSemanal.jsx`**

Modify `teste/src/components/MapaInsercoesSemanal.jsx:1-27` — replace the imports and props list:

```jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Repeat, ArrowRight, Pencil } from 'lucide-react';
import { normalizeMark, markQuantity } from '../utils/weekLock';
import { computeWeekWindows } from '../utils/weekWindows';
import { getNextTituloLetter } from '../utils/titulos';

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
    titulos,
    tituloAtivo,
    onSetTituloAtivo,
    onAddTitulo,
    onRenameTitulo,
    onShowResumo,
}) => {
```

Modify `teste/src/components/MapaInsercoesSemanal.jsx:39-43` (right after the `week`/`canReplicate`/`atLimit` block, before `const siglasOptions = ...`) — add título picker local state and derived values:

```jsx
    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);
    const [editingCell, setEditingCell] = useState(null); // { rowIdx, day } | null
    const [editValue, setEditValue] = useState('');
    const [tituloDropdownOpen, setTituloDropdownOpen] = useState(false);
    const [renamingLetra, setRenamingLetra] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const tituloAtivoNome = titulos.find(t => t.letra === tituloAtivo)?.nome || '';
    const nextTituloLetter = getNextTituloLetter(titulos);

    const commitRename = () => {
        if (renamingLetra) onRenameTitulo(renamingLetra, renameValue);
        setRenamingLetra(null);
        setRenameValue('');
    };
```

Modify `teste/src/components/MapaInsercoesSemanal.jsx` — insert the título picker JSX between the closing `</div>` of `.mapa-semanal-header` and the `.mapa-semanal-dow-row` div. Currently these are adjacent:

```jsx
            </div>

            <div className="mapa-semanal-dow-row" style={{ gridTemplateColumns: rowGridTemplate }}>
```

Insert the new block between them, so the file reads:

```jsx
            </div>

            <div className="mapa-semanal-titulo-row">
                <button
                    type="button"
                    className="mapa-semanal-titulo-pill"
                    onClick={() => setTituloDropdownOpen(o => !o)}
                >
                    <span className="mapa-semanal-titulo-letra">{tituloAtivo}</span>
                    {tituloAtivoNome || `Título ${tituloAtivo}`}
                    <ChevronDown size={14} />
                </button>
                {tituloDropdownOpen && (
                    <>
                        <div className="mapa-semanal-titulo-backdrop" onClick={() => { setTituloDropdownOpen(false); commitRename(); }} />
                        <div className="mapa-semanal-titulo-dropdown">
                            {titulos.map(t => (
                                <div key={t.letra} className="mapa-semanal-titulo-option">
                                    {renamingLetra === t.letra ? (
                                        <input
                                            autoFocus
                                            className="mapa-semanal-titulo-rename-input"
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={commitRename}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') e.currentTarget.blur();
                                                else if (e.key === 'Escape') { setRenamingLetra(null); setRenameValue(''); }
                                            }}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={`mapa-semanal-titulo-option-btn${t.letra === tituloAtivo ? ' is-active' : ''}`}
                                            onClick={() => { onSetTituloAtivo(t.letra); setTituloDropdownOpen(false); }}
                                        >
                                            <span className="mapa-semanal-titulo-letra">{t.letra}</span>
                                            {t.nome || `Título ${t.letra}`}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="mapa-semanal-titulo-edit-btn"
                                        onClick={() => { setRenamingLetra(t.letra); setRenameValue(t.nome); }}
                                        aria-label={`Renomear título ${t.letra}`}
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </div>
                            ))}
                            {nextTituloLetter && (
                                <button
                                    type="button"
                                    className="mapa-semanal-titulo-add-btn"
                                    onClick={() => onAddTitulo(nextTituloLetter)}
                                >
                                    <Plus size={14} /> Adicionar título {nextTituloLetter}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

```

Modify `teste/src/components/MapaInsercoesSemanal.jsx` — the day-cell button's `onClick` (inside the `week.days.map` block, the non-editing/non-locked return case). Change:

```jsx
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
```

to:

```jsx
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    className={`mapa-semanal-cell${mark ? ' is-marked' : ''}${isWeekend ? ' is-weekend' : ''}`}
                                    onClick={() => (mark ? startEdit(rowIdx, d, mark) : onSetDayMark(rowIdx, d, tituloAtivo))}
                                >
                                    {mark}
                                </button>
                            );
```

- [ ] **Step 4: Add título picker CSS**

Modify `teste/src/index.css` — append right after the existing `.mapa-semanal-header` block (after the `.mapa-semanal-praca` rule, before `.mapa-semanal-week-nav`), so the título picker's rules sit next to the header rules they visually belong with:

```css
.mapa-semanal-titulo-row {
  display: flex;
  justify-content: center;
  position: relative;
  margin-top: 0.5rem;
}

.mapa-semanal-titulo-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 50px;
  border: 1.5px solid var(--primary);
  background: rgba(90, 28, 219, 0.06);
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 0.76rem;
  cursor: pointer;
}

.mapa-semanal-titulo-letra {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  font-size: 0.62rem;
  font-weight: 800;
  flex-shrink: 0;
}

.mapa-semanal-titulo-backdrop {
  position: fixed;
  inset: 0;
  z-index: 205;
}

.mapa-semanal-titulo-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  min-width: 220px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 210;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}

.mapa-semanal-titulo-option {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #f1f5f9;
}

.mapa-semanal-titulo-option-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: none;
  padding: 0.2rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
  text-align: left;
}

.mapa-semanal-titulo-option-btn.is-active {
  color: var(--primary);
  font-weight: 800;
}

.mapa-semanal-titulo-edit-btn {
  border: none;
  background: none;
  color: #94a3b8;
  padding: 0.25rem;
  display: flex;
  cursor: pointer;
  flex-shrink: 0;
}

.mapa-semanal-titulo-rename-input {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border: 1.5px solid var(--primary);
  border-radius: 6px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  outline: none;
}

.mapa-semanal-titulo-add-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border: none;
  background: none;
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
```

- [ ] **Step 5: Lint and build**

Run: `cd teste && npx eslint src/components/MapaInsercoesSemanal.jsx src/pages/MidiaAvulsaPage.jsx && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 6: Manual verification with Playwright**

Start the dev server (`cd teste && npm run dev -- --port 5183 --strictPort`, background it). Using Playwright at `/opt/node22/lib/node_modules/playwright/index.mjs` with Chromium at `/opt/pw-browsers/chromium`, at viewport 428×926: open Mídia Avulsa, switch to Slide, add a program. Confirm:
- The título pill shows "A Campanha".
- Opening the pill shows the dropdown with "A — Campanha" and "+ Adicionar título B".
- Clicking "+ Adicionar título B" adds it; opening the pill again shows both A and B, B with no name yet (renders "Título B" as placeholder text — the actual stored `nome` is `''`).
- Clicking the pencil next to B, typing "Institucional", and blurring renames it; reopening the dropdown shows "B — Institucional".
- Selecting "B — Institucional" sets it active (pill now shows "B Institucional").
- Tapping an **empty** day cell immediately shows "B" in that cell (no input, no keyboard).
- Tapping that **same, now-filled** cell opens the manual edit input (autofocused), confirming manual editing still works.

- [ ] **Step 7: Commit**

```bash
git add teste/src/components/MapaInsercoesSemanal.jsx teste/src/pages/MidiaAvulsaPage.jsx teste/src/index.css
git commit -m "feat: add título picker and tap-to-fill to the mobile week editor"
```

---

### Task 3: Título legend on the exported grid

**Files:**
- Modify: `teste/src/components/MapaInsercoes.jsx:34-52` (props), and the header block (`{/* Header */}` ... closing `</div>` before `{/* Grid */}`)
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx` — pass `titulosUsados` to `MapaInsercoes`

**Interfaces:**
- Consumes: `computeTitulosUsados` (Task 1, `../utils/titulos`); `titulos`, `mapRows` (existing state in `MidiaAvulsaPage.jsx`).
- Produces: `MapaInsercoes` gains a new prop `titulosUsados: {letra, nome: string|null}[] = []`. No later task consumes this directly (it's the final render step), but the shape must match exactly what `computeTitulosUsados` returns.

- [ ] **Step 1: Compute `titulosUsados` in `MidiaAvulsaPage.jsx`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:1-8` — add the import (this is the
first task that needs it):

```js
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings2, Check, Camera, Plus, Trash2, Home, FileDown } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import MidiaAvulsaCard from '../components/MidiaAvulsaCard';
import MapaInsercoes from '../components/MapaInsercoes';
import MapaInsercoesSemanal from '../components/MapaInsercoesSemanal';
import ResumoSlidePage from '../components/ResumoSlidePage';
import { getAllowedWeekdays, markQuantity } from '../utils/weekLock';
import { computeTitulosUsados } from '../utils/titulos';
```

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — add right after the `enrichedRows` block (after the closing `});` of the `.map(row => {...})` call, before `const total30 = ...`):

```js
    const titulosUsados = computeTitulosUsados(titulos, mapRows);
```

- [ ] **Step 2: Pass it to `MapaInsercoes`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — in the `<MapaInsercoes ... />` call inside `.slide-scale-wrapper` (the one wrapped by `page1Ref`), add `titulosUsados={titulosUsados}` right after `resumoProps={{ totalVisualizacoes, secondsCards, numVisibleCards }}`:

```jsx
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
                    titulosUsados={titulosUsados}
                />
```

- [ ] **Step 3: Accept the prop and render the legend in `MapaInsercoes.jsx`**

Modify `teste/src/components/MapaInsercoes.jsx:34-52` — add `titulosUsados = []` to the props list:

```js
const MapaInsercoes = ({
    pracaLabel,
    monthLabel,
    year,
    monthIndex, // 0-11
    daysInMonth,
    rows, // [{ sigla, marks, programa, horario, allowedWeekdays, valor10, valor15, valor30 }]
    programas,
    activeSecondsList, // [{ segundos, ... }] — quais colunas de preço mostrar
    onSetDayMark,
    onAddRow,
    onDeleteRow,
    onReorderRows,
    onReplicateWeek,
    maxRows,
    compact = true, // linhas compactas (quando a tabela divide a página com o resumo)
    showResumo = false,
    resumoProps,
    titulosUsados = [], // [{ letra, nome }] — só os títulos com marcação no mapa; legenda no header
}) => {
```

Modify `teste/src/components/MapaInsercoes.jsx` — insert the legend right after the header `<div>` block closes (right after the `</div>` at the end of the `{/* Header */}` block, before the `{/* Grid */}` comment):

```jsx
            {titulosUsados.length > 0 && (
                <div style={{
                    textAlign: 'center', marginBottom: '0.6rem',
                    display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap',
                    fontSize: '0.62rem', fontWeight: 700, color: '#666',
                }}>
                    {titulosUsados.map(t => (
                        <span key={t.letra}>
                            <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{t.letra}</span>
                            {t.nome ? ` — ${t.nome}` : ''}
                        </span>
                    ))}
                </div>
            )}
```

- [ ] **Step 4: Build**

Run: `cd teste && npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual verification with Playwright**

At viewport 1440×900 (desktop — so the grid renders directly, no popup needed yet), open Mídia Avulsa → Slide, add a program, mark a cell with "A" via typing (desktop still free-types). Confirm no legend shows (título A has no matching entry unless one was created — by default `titulos` is `[{letra:'A', nome:'Campanha'}]`, so marking with "A" should show "A — Campanha" in the legend). Mark another cell with "2C" (a letter with no título entry) and confirm the legend adds a bare "C" with no dash/name.

- [ ] **Step 6: Commit**

```bash
git add teste/src/components/MapaInsercoes.jsx teste/src/pages/MidiaAvulsaPage.jsx
git commit -m "feat: show used-títulos legend on the exported Mapa de Inserções"
```

---

### Task 4: Replace "modo resumo" with the export preview popup

**Files:**
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx` — remove `mobileGridView` state/effects, remove `slideScaleWrapperRef`, add `exportPreviewOpen`, rewrite the Slide-format render branch and the floating-action PDF button.
- Modify: `teste/src/index.css` — remove the `slide-desktop-mode` block, the old dead `.slide-scale-wrapper` scale rule, `.mobile-back-to-editor-btn`; add popup overlay + close/share button styles.

**Interfaces:**
- Produces: `exportPreviewOpen: boolean` state in `MidiaAvulsaPage.jsx`, replacing `mobileGridView`. No other task reads this directly (Task 5 reads/writes it only via the same `setExportPreviewOpen`/`onShowResumo`/close-button wiring already established here).

- [ ] **Step 1: Remove the old `mobileGridView` state, its reset effect, and the `zoomActive`/scroll effects; add `exportPreviewOpen`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:1-9` — add the `X` icon import (this
task's close button is the first thing that needs it):

```js
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings2, Check, Camera, Plus, Trash2, Home, FileDown, X } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import MidiaAvulsaCard from '../components/MidiaAvulsaCard';
import MapaInsercoes from '../components/MapaInsercoes';
import MapaInsercoesSemanal from '../components/MapaInsercoesSemanal';
import ResumoSlidePage from '../components/ResumoSlidePage';
import { getAllowedWeekdays, markQuantity } from '../utils/weekLock';
import { computeTitulosUsados } from '../utils/titulos';
```

Modify `teste/src/pages/MidiaAvulsaPage.jsx:93-97`. Replace:

```js
    const [formato, setFormato] = useState('card'); // 'card' | 'slide'
    // No formato slide em mobile: 'editar' mostra o editor semanal novo,
    // 'resumo' mostra a grade desktop (pinça/zoom) pra conferir preço e exportar.
    const [mobileGridView, setMobileGridView] = useState('editar');
    const [titulos, setTitulos] = useState([{ letra: 'A', nome: 'Campanha' }]);
    const [tituloAtivo, setTituloAtivo] = useState('A');
    const [mapRows, setMapRows] = useState([]); // [{ sigla, marks: { [day]: string } }] — usado no formato slide
```

with:

```js
    const [formato, setFormato] = useState('card'); // 'card' | 'slide'
    const [titulos, setTitulos] = useState([{ letra: 'A', nome: 'Campanha' }]);
    const [tituloAtivo, setTituloAtivo] = useState('A');
    // Popup de "Ver resumo e exportar" no formato slide (mobile) — mostra a
    // grade desktop (page1Ref/page2Ref) num overlay de tela cheia, em vez de
    // trocar a página inteira de layout como o mecanismo antigo fazia.
    const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
    const [mapRows, setMapRows] = useState([]); // [{ sigla, marks: { [day]: string } }] — usado no formato slide
```

Modify `teste/src/pages/MidiaAvulsaPage.jsx:115-118` (the refs). Replace:

```js
    const cardRef = useRef(null);
    const page1Ref = useRef(null);
    const page2Ref = useRef(null);
    const slideScaleWrapperRef = useRef(null);
```

with:

```js
    const cardRef = useRef(null);
    const page1Ref = useRef(null);
    const page2Ref = useRef(null);
```

Modify `teste/src/pages/MidiaAvulsaPage.jsx:126-175` — this whole block (the format-change reset effect, the `zoomActive`/`slide-desktop-mode` effect, and the scroll-into-view effect) is replaced by one small effect. Replace:

```js
    // Trocar de formato sempre volta o mobile pro modo de edição (em vez de
    // ficar preso no modo resumo de um formato que não está mais visível).
    useEffect(() => {
        setMobileGridView('editar');
    }, [formato]);

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

    // Ao entrar no modo "resumo" no mobile, o layout vira "desktop" (pinça/zoom,
    // flex-direction: row) e o usuário aterrissa com a sidebar de 400px ocupando
    // a tela inteira — a grade e o botão "Voltar a editar" ficam fora da viewport
    // à direita, sem indicação de como chegar lá sem saber dar pinch-zoom-out antes.
    // Rola a grade pra dentro da viewport assim que o layout "desktop" assentar
    // (por isso o duplo rAF: um efeito só não é suficiente pra pegar o layout já
    // recalculado com as classes/estilos novos aplicados). Mira em slideScaleWrapperRef
    // (não page1Ref) porque o botão "Voltar a editar" é o 1º filho desse wrapper,
    // antes da grade — alinhar o TOPO do wrapper (block:'start') traz os dois pra
    // dentro da viewport juntos; alinhar o topo só da grade (page1Ref) deixava o
    // botão, que fica acima dela, cortado pra fora por cima (verificado com Playwright).
    useEffect(() => {
        if (formato !== 'slide' || mobileGridView !== 'resumo') return undefined;
        let raf2 = null;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                slideScaleWrapperRef.current?.scrollIntoView({ inline: 'center', block: 'start' });
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2 !== null) cancelAnimationFrame(raf2);
        };
    }, [formato, mobileGridView]);
```

with:

```js
    // Trocar de formato sempre fecha o popup de exportação (em vez de ficar
    // aberto sobre um formato que não está mais visível).
    useEffect(() => {
        setExportPreviewOpen(false);
    }, [formato]);

    // Enquanto o popup de exportação está aberto, libera pinça/zoom nativo do
    // navegador pra o usuário conferir o mapa/preço por inteiro antes de
    // compartilhar/baixar. O popup em si (.slide-scale-wrapper.export-preview-open,
    // ver index.css) já é um overlay de tela cheia — não precisa de nenhum
    // ajuste de layout do resto da página, só liberar o zoom.
    useEffect(() => {
        const zoomActive = Boolean(active) && exportPreviewOpen;
        const meta = document.querySelector('meta[name="viewport"]');
        const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        const ZOOM_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=1';
        if (meta) meta.setAttribute('content', zoomActive ? ZOOM_VIEWPORT : DEFAULT_VIEWPORT);
        return () => {
            if (meta) meta.setAttribute('content', DEFAULT_VIEWPORT);
        };
    }, [active, exportPreviewOpen]);
```

- [ ] **Step 2: Rewrite the Slide-format render branch**

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — replace the entire Slide-format
branch (everything between the Card-format JSX and `<div className="mobile-floating-actions">`).
After Tasks 2 and 3, this block reads:

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
                                titulos={titulos}
                                tituloAtivo={tituloAtivo}
                                onSetTituloAtivo={setTituloAtivo}
                                onAddTitulo={handleAddTitulo}
                                onRenameTitulo={handleRenameTitulo}
                                onShowResumo={() => setMobileGridView('resumo')}
                            />
                        </div>
                        <div
                            ref={slideScaleWrapperRef}
                            className={`slide-scale-wrapper${mobileGridView === 'editar' ? ' mobile-editing-active' : ''}`}
                        >
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
                                    titulosUsados={titulosUsados}
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

Replace it with:

```jsx
                ) : (
                    <>
                        <div className="mobile-slide-editor">
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
                                titulos={titulos}
                                tituloAtivo={tituloAtivo}
                                onSetTituloAtivo={setTituloAtivo}
                                onAddTitulo={handleAddTitulo}
                                onRenameTitulo={handleRenameTitulo}
                                onShowResumo={() => setExportPreviewOpen(true)}
                            />
                        </div>
                        <div className={`slide-scale-wrapper${exportPreviewOpen ? ' export-preview-open' : ''}`}>
                            {exportPreviewOpen && (
                                <button
                                    type="button"
                                    className="export-preview-close-btn"
                                    onClick={() => setExportPreviewOpen(false)}
                                    aria-label="Fechar"
                                >
                                    <X size={20} />
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
                                    titulosUsados={titulosUsados}
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
                            {exportPreviewOpen && (
                                <button
                                    type="button"
                                    className="export-preview-share-btn"
                                    onClick={handleExportPdf}
                                >
                                    {isCopied ? <Check size={18} /> : <FileDown size={18} />}
                                    Exportar PDF
                                </button>
                            )}
                        </div>
                    </>
                )}
```

- [ ] **Step 3: Simplify the floating-action PDF button**

Modify `teste/src/pages/MidiaAvulsaPage.jsx` — the `formato === 'card' ? (...) : (...)` block inside `.mobile-floating-actions`. Replace the `else` branch:

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

with:

```jsx
                    ) : (
                        <button
                            className="mobile-copy-btn"
                            onClick={() => setExportPreviewOpen(true)}
                            title="Ver resumo e exportar"
                        >
                            <FileDown size={22} />
                        </button>
                    )}
```

(This button now only opens the same popup reachable from `MapaInsercoesSemanal`'s own "Ver resumo e exportar" — it no longer exports directly, so the copied-checkmark feedback moved to the popup's own share button.)

- [ ] **Step 4: Remove the obsolete CSS and add the popup's**

Modify `teste/src/index.css`. Three removals, in this order (top to bottom of the file):

**4a.** Remove the dead `.slide-scale-wrapper` scale rule inside the base mobile block (it was already unreachable — `slide-desktop-mode` always overrode it — and the concept it implemented no longer exists). Delete:

```css
  /* Scale the 2 landscape 1000px pages (stacked) to fit mobile width */
  .slide-scale-wrapper {
    transform: scale(0.36);
    transform-origin: top center;
    gap: 1rem;
    padding: 1rem 0;
    /* 2 pages (1000px * 210/297 tall each) + gap + padding, scaled down */
    height: calc((707px * 2 + 16px + 32px) * 0.36);
    margin-top: 1rem;
  }

```

**4b.** Remove the entire `SLIDE FORMAT ON MOBILE: NO MOBILE LAYOUT` block (the `slide-desktop-mode` mechanism, now unused — nothing sets that class anymore, since the popup is a self-contained overlay instead of a full-page layout switch). It sits between the base `MOBILE LAYOUT` block's closing `}` and the `MAPA DE INSERÇÕES — EDITOR SEMANAL MOBILE` comment. Delete this entire block:

```css
/* ==============================
   SLIDE FORMAT ON MOBILE: NO MOBILE LAYOUT
   Toggled via the "slide-desktop-mode" class on <html> (MidiaAvulsaPage) whenever
   the Slide format is active on a small screen. Editing the map cell-by-cell needs
   the real desktop layout at full size — reachable by native pinch-zoom + pan
   (enabled by the dynamic viewport meta) instead of a shrunk-down mobile view.
   touch-action: pinch-zoom allows the pinch gesture but blocks 1-finger panning,
   so a stray touch never scrolls the page while the user taps a cell to edit it.
   ============================== */
@media (max-width: 768px), (max-height: 500px) and (orientation: landscape) {
  html.slide-desktop-mode,
  html.slide-desktop-mode body {
    height: auto;
    overflow: visible;
    touch-action: pinch-zoom;
  }

  html.slide-desktop-mode #root>div {
    overflow: visible !important;
  }

  /* Tudo abaixo é escopado em ".midia-avulsa-app" (só existe na página Mídia
     Avulsa) — o app mantém as 5 páginas sempre montadas (só opacity/pointer-events
     alternam), então um seletor genérico ".sidebar"/".main-content" vazaria pra
     Patrocínio/Pesquisa Rápida enquanto ficam escondidas ao fundo. */
  html.slide-desktop-mode .page-wrapper:has(.midia-avulsa-app) {
    height: auto;
    overflow: visible;
    touch-action: pinch-zoom;
  }

  html.slide-desktop-mode .midia-avulsa-app {
    height: auto;
    overflow: visible;
    touch-action: pinch-zoom;
    flex-direction: row;
    width: max-content;
    min-width: 100%;
  }

  html.slide-desktop-mode .midia-avulsa-app .desktop-only {
    display: flex !important;
  }

  html.slide-desktop-mode .midia-avulsa-app .sidebar {
    position: static;
    width: 400px;
    flex: 0 0 400px;
    height: auto;
    max-height: none;
    transform: none;
    border-radius: 0;
    box-shadow: var(--shadow-sm);
    padding: 2rem;
    overflow-y: visible;
  }

  html.slide-desktop-mode .midia-avulsa-app .main-content {
    flex: 0 0 auto;
    width: max-content;
    padding: 2rem;
    overflow: visible;
  }

  html.slide-desktop-mode .midia-avulsa-app .slide-scale-wrapper {
    transform: none;
    height: auto;
    margin-top: 0;
  }

  html.slide-desktop-mode .midia-avulsa-app .mobile-tray-toggle,
  html.slide-desktop-mode .midia-avulsa-app .mobile-home-btn,
  html.slide-desktop-mode .midia-avulsa-app .sidebar-header-mobile,
  html.slide-desktop-mode .midia-avulsa-app .close-tray-btn,
  html.slide-desktop-mode .midia-avulsa-app .mobile-overlay {
    display: none !important;
  }

  html.slide-desktop-mode .midia-avulsa-app .mobile-floating-actions {
    position: static;
    transform: none;
    width: auto;
    max-width: none;
    margin: 1rem auto;
  }
}
```

**4c.** Remove `.mobile-back-to-editor-btn` (no longer used — replaced by the close icon):

```css
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

**4d.** Replace the `MAPA DE INSERÇÕES — EDITOR SEMANAL MOBILE` block's opening rules (the `.mobile-slide-editor` base rule and the `@media` block containing `.mobile-slide-editor.mobile-editing-active`/`.slide-scale-wrapper.mobile-editing-active`/`.mobile-copy-btn.mobile-editing-active`) — replace:

```css
.mobile-slide-editor {
  display: none;
}

@media (max-width: 768px), (max-height: 500px) and (orientation: landscape) {
  .mobile-slide-editor.mobile-editing-active {
    display: block;
    align-self: stretch;      /* stop shrink-to-fit sizing */
    flex: 1 1 auto;
    min-height: 0;            /* allow the flex item to shrink below content, enabling its own scroll */
    overflow-y: auto;
  }

  .slide-scale-wrapper.mobile-editing-active {
    display: none;
  }

  .mobile-copy-btn.mobile-editing-active {
    display: none;
  }
}
```

with:

```css
.mobile-slide-editor {
  display: none;
}

@media (max-width: 768px), (max-height: 500px) and (orientation: landscape) {
  .mobile-slide-editor {
    display: block;
    align-self: stretch;      /* stop shrink-to-fit sizing */
    flex: 1 1 auto;
    min-height: 0;            /* allow the flex item to shrink below content, enabling its own scroll */
    overflow-y: auto;
  }

  /* .slide-scale-wrapper (grade desktop, alvo da exportação) só aparece no
     mobile dentro do popup — nunca "por baixo" do editor semanal. */
  .slide-scale-wrapper {
    display: none;
  }

  .slide-scale-wrapper.export-preview-open {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(20, 12, 36, 0.72);
    padding: 3.5rem 1rem 2rem;
    margin: 0;
    overflow: auto;
    align-items: flex-start;
    justify-content: center;
    touch-action: manipulation;
  }

  .export-preview-close-btn {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1001;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.92);
    color: var(--text-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  .export-preview-share-btn {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.4rem;
    border-radius: 50px;
    border: none;
    background: var(--primary);
    color: white;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(90, 28, 219, 0.4);
  }
}
```

- [ ] **Step 5: Build**

Run: `cd teste && npm run build`
Expected: succeeds.

- [ ] **Step 6: Manual verification with Playwright**

At viewport 428×926: open Mídia Avulsa → Slide, add a program and mark a cell. Click "Ver resumo e exportar". Confirm:
- A full-screen overlay appears showing the grid (and resumo, if `useSinglePage`) — no sidebar, no "Editar Card"/Home floating buttons visible underneath (the overlay covers them).
- The close (X) button is visible top-right; clicking it returns to the editor with the mark still there.
- The floating-actions bar's 3rd button (PDF icon) also opens the same popup when tapped from the editor view.

At viewport 1440×900 (desktop): confirm the grid renders inline as before (no popup chrome, no close button, no share button) and marking cells still works by typing directly.

- [ ] **Step 7: Commit**

```bash
git add teste/src/pages/MidiaAvulsaPage.jsx teste/src/index.css
git commit -m "feat: replace full-page modo resumo with an export preview popup"
```

---

### Task 5: Native share (Web Share API) for the exported PDF

**Files:**
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx` — `handleExportPdf`

**Interfaces:** none new — this task only changes `handleExportPdf`'s internals; its call sites (Task 4's popup share button, and the floating-action button that now opens the popup instead) are unaffected.

- [ ] **Step 1: Add native share with fallback to `handleExportPdf`**

Modify `teste/src/pages/MidiaAvulsaPage.jsx:371-403` (the whole `handleExportPdf` function). Replace:

```js
    const handleExportPdf = async () => {
        if (!page1Ref.current) return;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 400);
        try {
            const htmlToImage = await import('html-to-image');
            const { jsPDF } = await import('jspdf');
            const exportOpts = {
                quality: 0.92,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                filter: (node) => !node.classList?.contains('no-export'),
            };
            const widthMm = 297;
            const heightMm = 210;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [widthMm, heightMm], compress: true });

            const img1 = await htmlToImage.toJpeg(page1Ref.current, exportOpts);
            pdf.addImage(img1, 'JPEG', 0, 0, widthMm, heightMm);

            if (!useSinglePage && page2Ref.current) {
                const img2 = await htmlToImage.toJpeg(page2Ref.current, exportOpts);
                pdf.addPage([widthMm, heightMm], 'landscape');
                pdf.addImage(img2, 'JPEG', 0, 0, widthMm, heightMm);
            }

            pdf.save('midia-avulsa-mapa.pdf');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            alert('Erro ao gerar PDF. Tente novamente.');
        }
    };
```

with:

```js
    const handleExportPdf = async () => {
        if (!page1Ref.current) return;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 400);
        try {
            const htmlToImage = await import('html-to-image');
            const { jsPDF } = await import('jspdf');
            const exportOpts = {
                quality: 0.92,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                filter: (node) => !node.classList?.contains('no-export'),
            };
            const widthMm = 297;
            const heightMm = 210;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [widthMm, heightMm], compress: true });

            const img1 = await htmlToImage.toJpeg(page1Ref.current, exportOpts);
            pdf.addImage(img1, 'JPEG', 0, 0, widthMm, heightMm);

            if (!useSinglePage && page2Ref.current) {
                const img2 = await htmlToImage.toJpeg(page2Ref.current, exportOpts);
                pdf.addPage([widthMm, heightMm], 'landscape');
                pdf.addImage(img2, 'JPEG', 0, 0, widthMm, heightMm);
            }

            // No popup mobile, tenta abrir o menu nativo de compartilhar (WhatsApp
            // etc.) com o PDF já pronto; sem suporte (a maioria dos navegadores
            // desktop, e alguns mobile antigos), cai pro download direto de sempre.
            const pdfBlob = pdf.output('blob');
            const pdfFile = new File([pdfBlob], 'midia-avulsa-mapa.pdf', { type: 'application/pdf' });
            if (navigator.canShare?.({ files: [pdfFile] })) {
                await navigator.share({ files: [pdfFile], title: 'Mapa de Inserções' });
            } else {
                pdf.save('midia-avulsa-mapa.pdf');
            }

            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            if (err?.name === 'AbortError') return; // usuário cancelou o menu de compartilhar
            alert('Erro ao gerar PDF. Tente novamente.');
        }
    };
```

- [ ] **Step 2: Build**

Run: `cd teste && npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual verification with Playwright**

Headless Chromium launched without special flags has no `navigator.share`/`navigator.canShare` (confirm this first: `await page.evaluate(() => typeof navigator.share)` should log `"undefined"`). At viewport 428×926, mark a cell, open the export popup, and set up a `page.on('download', ...)` listener before clicking "Exportar PDF". Confirm a download event fires (the fallback path) with a non-trivial file size, and no `alert()`/error dialog appears.

- [ ] **Step 4: Commit**

```bash
git add teste/src/pages/MidiaAvulsaPage.jsx
git commit -m "feat: share exported PDF via the native share sheet, with download fallback"
```

---

### Task 6: End-to-end verification (Playwright)

**Files:** none (verification only — fix in the relevant file and fold into this task's commit if something's found broken).

- [ ] **Step 1: Start the dev server**

Run (background): `cd teste && npm run dev -- --port 5183 --strictPort`

- [ ] **Step 2: Full mobile flow, viewport 428×926**

Open Mídia Avulsa → Slide. Add 2 programs. Confirm:
- Título pill defaults to "A Campanha"; tapping an empty cell on the first program marks it "A" (bare letter, no digit).
- Add título B ("Institucional"), switch active título to B, tap a different empty cell on the second program → marks "B".
- Tap the "A"-marked cell again → edit input opens, type "2A", blur → cell shows "2A", week QTD updates.
- Open "Ver resumo e exportar" → popup shows grid with legend "A — Campanha" and "B — Institucional" (both used), no sidebar/floating buttons visible. Close with X → back to editor, marks intact.

- [ ] **Step 3: Landscape check, viewport 926×428**

Repeat the título-pill-visible / tap-to-fill / popup-open-close sequence at this viewport (the orientation the original breakpoint fix targeted) with just 2 programs, confirming the editor is still fully scrollable and the popup still covers the full screen (no leftover pinch-zoom-only desktop layout).

- [ ] **Step 4: Desktop regression, viewport 1440×900**

Confirm: `.mobile-slide-editor` computes `display:none`; the grid renders inline, full width, no popup chrome ever appears; typing a mark directly (e.g. "3D") still works with no título picker present; the legend shows any used letters including "D" (bare, no título entry for D).

- [ ] **Step 5: Card format regression**

Switch to Card format (both viewports) and confirm it's visually and functionally unchanged (no título UI, no popup — this format was never touched).

- [ ] **Step 6: Fix anything the checks above surface**

If any assertion fails, fix the relevant file and re-run the specific failing check before continuing.

- [ ] **Step 7: Final full-suite check and commit (only if fixes were needed)**

Run: `cd teste && npm test && npm run build`
Expected: PASS / succeeds.

```bash
git add -A
git commit -m "fix: address issues found in título/popup verification pass"
```

(Skip this commit if Step 6 required no changes.)
