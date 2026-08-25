# Exportar PI (Pedido de Inserção) em PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão "Exportar para PI" ao Mídia Avulsa (formato Slide) que gera um PDF de 1 página replicando visualmente o formulário real de PI (Pedido de Inserção) da emissora, com programas/marcas/valores já preenchidos a partir dos dados do mapa.

**Architecture:** Componente React novo (`PISlide.jsx`), puramente apresentacional, seguindo a mesma convenção de `MapaInsercoes.jsx` (página A4 paisagem, estilos inline, sem CSS dedicado). `MidiaAvulsaPage.jsx` computa os dados derivados (segundagem ativa única, totais) e reaproveita o pipeline de exportação já existente (`html-to-image` + `jsPDF`, compartilhar nativo com fallback de download).

**Tech Stack:** React 19, Vite, `html-to-image`, `jspdf`, `lucide-react` — nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-08-25-exportar-pi-pdf.md`

## Global Constraints

- Não manipular `.xlsx` em nenhum momento — a PI é gerada como imagem/PDF, igual ao Mapa de Inserções.
- O botão "Exportar para PI" fica desabilitado sempre que mais de uma segundagem (10"/15"/30") estiver ativa ao mesmo tempo — só habilita com exatamente uma.
- Dados de cliente/empresa (nome, endereço, contato, CGC, PI número, produto, segmento, material, cond. negociada) sempre em branco.
- Dados da emissora (razão social/endereço/CNPJ) só preenchidos quando `selectedPraca === 'rio_verde'`; em branco nas outras 7 praças.
- Cond. Pagamento sempre mostra o texto fixo `15 DFM`.
- 1 página A4 paisagem (297×210mm) — mesmo formato usado em `MapaInsercoes.jsx`/`ResumoSlidePage.jsx`.
- Botão aparece nos mesmos 2 lugares que "Exportar PDF": dentro do popup de exportação mobile e no botão flutuante do desktop/mobile.

---

### Task 1: Componente `PISlide.jsx`

**Files:**
- Create: `teste/src/components/PISlide.jsx`

**Interfaces:**
- Consumes: `formatMoney` de `../utils/cardHelpers` (já existe, `formatMoney(val, decimals)` → string formatado `pt-BR`).
- Produces: `export default PISlide`, componente que recebe as props abaixo e renderiza a página A4 paisagem completa (sem side effects, sem estado):
  - `pracaKey` (string, ex. `'rio_verde'`)
  - `pracaLabel` (string, ex. `'RIO VERDE'`)
  - `monthLabelLong` (string, ex. `'Setembro'`)
  - `monthLabelShort` (string, ex. `'set/26'`)
  - `year` (number)
  - `monthIndex` (number, 0-11)
  - `daysInMonth` (number)
  - `rows` (array de `{ sigla, programa, dias, marks, insercoes, unit, total }`)
  - `titulosUsados` (array de `{ letra, nome }`)
  - `duracaoLabel` (string, ex. `'15"'`)
  - `descontoPercent` (number, ex. `10`)
  - `valorTabela` (number)
  - `totalMidia` (number)

- [ ] **Step 1: Criar o componente**

```jsx
import { formatMoney } from '../utils/cardHelpers';

// Dom..Sáb (getDay() index) — mesma convenção de MapaInsercoes.jsx.
const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const SIGLA_COL = 46;
const PROGRAMA_COL = 118;
const OCORRENCIA_COL = 92;
const DESC_COL = 34;
const TOTAL_COL = 28;
const DURACAO_COL = 32;
const UNIT_COL = 50;
const ROW_TOTAL_COL = 56;

// Único dado real que temos hoje sobre a emissora (do exemplo de PI real
// fornecido pelo usuário, praça Rio Verde) — ver spec, seção "Decisões".
const RIO_VERDE_EMISSORA = {
    nome: 'TELEVISÃO RIVIERA LTDA',
    endereco: 'Rodovia BR-452, KM:01 - SETOR INDUSTRIAL, Rio Verde-GO, CEP 75.901-970',
    cnpj: 'Inscrita no CNPJ/MF sob o nº. 01.073.899/0001-35',
};

// Campo do formulário que a Mídia Avulsa ainda não coleta (dados de
// cliente/empresa) — label pequeno + caixa cinza vazia, igual ao modelo real.
const BlankField = ({ label, flex = 1 }) => (
    <div style={{ flex, minWidth: 0 }}>
        <div style={{ fontSize: '0.42rem', fontWeight: 700, color: '#333', marginBottom: '0.1rem' }}>{label}</div>
        <div style={{ height: '13px', background: '#e2e2e9', borderRadius: '2px' }} />
    </div>
);

// Réplica visual, pra exportação em PDF, do formulário real de PI (Pedido de
// Inserção) usado pra fechar uma inserção avulsa — ver
// docs/superpowers/specs/2026-08-25-exportar-pi-pdf.md. Só exibe/formata; toda
// a computação (segundagem ativa, totais, títulos usados) já vem pronta de
// MidiaAvulsaPage.jsx.
const PISlide = ({
    pracaKey,
    pracaLabel,
    monthLabelLong,
    monthLabelShort,
    year,
    monthIndex,
    daysInMonth,
    rows,
    titulosUsados,
    duracaoLabel,
    descontoPercent,
    valorTabela,
    totalMidia,
}) => {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const gridTemplate = `${SIGLA_COL}px ${PROGRAMA_COL}px ${OCORRENCIA_COL}px ${DESC_COL}px repeat(${daysInMonth}, 1fr) ${TOTAL_COL}px ${DURACAO_COL}px ${UNIT_COL}px ${ROW_TOTAL_COL}px`;
    const emissora = pracaKey === 'rio_verde' ? RIO_VERDE_EMISSORA : null;

    return (
        <div style={{
            width: '1000px',
            aspectRatio: '297 / 210',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            padding: '1rem 1.2rem',
            fontFamily: "'Outfit', sans-serif",
            color: '#111',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ flex: '0 0 140px' }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 700 }}>Escolha a praça</div>
                    <div style={{ background: '#111', color: 'white', fontWeight: 800, fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '2px' }}>
                        {pracaLabel}
                    </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.5rem', lineHeight: 1.3 }}>
                    {emissora && (
                        <>
                            <div style={{ fontWeight: 800, fontSize: '0.62rem' }}>{emissora.nome}</div>
                            <div>{emissora.endereco}</div>
                            <div>{emissora.cnpj}</div>
                        </>
                    )}
                </div>
                <div style={{ flex: '0 0 260px', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', fontSize: '0.42rem', fontWeight: 700, textAlign: 'center' }}>
                    <div>
                        <div>Mês Veiculação</div>
                        <div style={{ fontWeight: 400 }}>{monthLabelShort}</div>
                    </div>
                    <div>
                        <div>PI</div>
                        <div style={{ height: '10px' }} />
                    </div>
                    <div>
                        <div>Data de Compra Emissão</div>
                        <div style={{ fontWeight: 400 }}>{new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
            </div>
            <div style={{ background: '#fef08a', fontSize: '0.5rem', fontWeight: 700, padding: '0.1rem 0.4rem', marginBottom: '0.35rem' }}>
                Tabela Vigente: {monthLabelLong}/{year}
            </div>

            {/* Bloco cliente (em branco) */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Cliente (Nome completo sem abreviaturas)" flex={3} />
                <BlankField label="Nome contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Nome Fantasia" flex={1} />
                <BlankField label="Endereço" flex={2} />
                <BlankField label="Código contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Bairro" flex={1} />
                <BlankField label="Cidade" flex={1} />
                <BlankField label="UF" flex="0 0 40px" />
                <BlankField label="CEP" flex="0 0 70px" />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <BlankField label="Fone" flex={1} />
                <BlankField label="Fax" flex={1} />
                <BlankField label="CGC/CPF" flex={1} />
                <BlankField label="Insc. Estadual" flex={1} />
            </div>

            {/* Tabela de títulos */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ flex: 3 }}>
                    <div style={{ display: 'flex', fontSize: '0.42rem', fontWeight: 700, marginBottom: '0.1rem' }}>
                        <div style={{ flex: '0 0 14px' }} />
                        <div style={{ flex: 3 }}>Título do comercial</div>
                        <div style={{ flex: 1 }}>Duração</div>
                        <div style={{ flex: 1 }}>Produto</div>
                        <div style={{ flex: 1 }}>Seg. Mercado</div>
                    </div>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'R'].map(letra => {
                        const t = titulosUsados.find(tu => tu.letra === letra);
                        const isR = letra === 'R';
                        return (
                            <div key={letra} style={{ display: 'flex', alignItems: 'center', marginBottom: '1px' }}>
                                <div style={{
                                    flex: '0 0 14px', fontSize: '0.42rem', fontWeight: 800, textAlign: 'center',
                                    background: isR ? '#dc2626' : 'transparent', color: isR ? 'white' : '#111',
                                }}>
                                    {letra}
                                </div>
                                <div style={{ flex: 3, height: '11px', background: '#e2e2e9', marginRight: '2px', display: 'flex', alignItems: 'center', paddingLeft: '0.2rem', fontSize: '0.44rem', fontWeight: 700 }}>
                                    {t?.nome || ''}
                                </div>
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9', marginRight: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.44rem', fontWeight: 700 }}>
                                    {t ? duracaoLabel : ''}
                                </div>
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9', marginRight: '2px' }} />
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9' }} />
                            </div>
                        );
                    })}
                </div>
                <div style={{ flex: 1, fontSize: '0.42rem', fontWeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.2rem', paddingBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '10px', height: '10px', background: '#e2e2e9' }} /> Arquivado na Emissora
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '10px', height: '10px', background: '#e2e2e9' }} /> Não arquivado até o momento
                    </div>
                </div>
            </div>

            {/* Cond. Pagamento / Negociadas / Observação */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 700, marginBottom: '0.1rem' }}>Cond. Pagamento</div>
                    <div style={{ height: '11px', fontSize: '0.44rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>15 DFM</div>
                </div>
                <BlankField label="Cond. Negociadas" flex={1} />
                <BlankField label="Observação" flex={2} />
            </div>

            {/* Grade de dias */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, fontSize: '0.4rem', fontWeight: 700, color: '#333' }}>
                    <div />
                    <div />
                    <div />
                    <div />
                    {days.map(d => <div key={d} style={{ textAlign: 'center' }}>{d}</div>)}
                    <div />
                    <div />
                    <div />
                    <div />
                </div>
                <div style={{
                    display: 'grid', gridTemplateColumns: gridTemplate,
                    fontSize: '0.4rem', fontWeight: 800, color: '#111',
                    borderBottom: '1.5px solid #111', paddingBottom: '0.1rem', marginBottom: '0.1rem',
                }}>
                    <div>SIGLA</div>
                    <div>PROGRAMA</div>
                    <div>OCORRÊNCIA</div>
                    <div>DESC.%</div>
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        return <div key={d} style={{ textAlign: 'center' }}>{WEEKDAY_LETTERS[dow]}</div>;
                    })}
                    <div style={{ textAlign: 'center' }}>TOTAL</div>
                    <div style={{ textAlign: 'center' }}>Duração</div>
                    <div style={{ textAlign: 'right' }}>unit</div>
                    <div style={{ textAlign: 'right' }}>total</div>
                </div>
                {rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{
                        display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
                        minHeight: '11px', fontSize: '0.4rem',
                        backgroundColor: rowIdx % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                    }}>
                        <div style={{ fontWeight: 800 }}>{row.sigla}</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.programa}</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.36rem' }}>{row.dias}</div>
                        <div style={{ textAlign: 'center' }}>{descontoPercent}%</div>
                        {days.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontWeight: 800 }}>
                                {row.marks[d] || ''}
                            </div>
                        ))}
                        <div style={{ textAlign: 'center', fontWeight: 800 }}>{row.insercoes}</div>
                        <div style={{ textAlign: 'center' }}>{duracaoLabel}</div>
                        <div style={{ textAlign: 'right' }}>{formatMoney(row.unit, 2)}</div>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(row.total, 2)}</div>
                    </div>
                ))}
            </div>

            {/* Bloco de valores + assinaturas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', flex: 1 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>ASSINATURA DO CLIENTE</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>Área Comercial</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>Agência</div>
                    </div>
                </div>
                <div style={{ flex: '0 0 180px', fontSize: '0.46rem', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Valor Tabela</span><span>{formatMoney(valorTabela, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}><span>Reaplicação</span><span>-</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Desconto</span><span>{descontoPercent}%</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Mídia</span><span>{formatMoney(totalMidia, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', fontWeight: 800, borderTop: '1px solid #111', paddingTop: '0.1rem' }}>
                        <span>Bruto</span><span>{formatMoney(totalMidia, 2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PISlide;
```

- [ ] **Step 2: Build para verificar que compila sem erros**

Run: `cd teste && npm run build`
Expected: build verde, sem erros de import/JSX (o componente ainda não é usado em lugar nenhum, então isso só confirma que o arquivo é sintaticamente válido — a verificação visual de verdade acontece no Task 3).

- [ ] **Step 3: Commit**

```bash
git add teste/src/components/PISlide.jsx
git commit -m "feat: add PISlide component replicating the PI form layout"
```

---

### Task 2: Botão "Exportar para PI" em `MidiaAvulsaPage.jsx`

**Files:**
- Modify: `teste/src/pages/MidiaAvulsaPage.jsx`
- Modify: `teste/src/index.css`

**Interfaces:**
- Consumes: `PISlide` (Task 1) com as props documentadas ali. `formatMoney`/`calculatePrice` já importados/usados no arquivo (`calculatePrice` está em `MidiaAvulsaCard.jsx`, não aqui — não precisamos dele; só usamos os totais já computados em `totalMap`).
- Produces: nada consumido por outra task — esta é a última mudança de código do plano.

- [ ] **Step 1: Import do componente e ícone novo**

Em `teste/src/pages/MidiaAvulsaPage.jsx`, linha 2 e 5-6 — adicionar `FileSpreadsheet` ao import do `lucide-react` e importar `PISlide`:

```js
import { ArrowLeft, Settings2, Check, Camera, Plus, Trash2, Home, FileDown, FileSpreadsheet, X } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import MidiaAvulsaCard from '../components/MidiaAvulsaCard';
import MapaInsercoes from '../components/MapaInsercoes';
import MapaInsercoesSemanal from '../components/MapaInsercoesSemanal';
import PISlide from '../components/PISlide';
import ResumoSlidePage from '../components/ResumoSlidePage';
```

- [ ] **Step 2: Tabela de meses abreviados**

Logo abaixo da constante `MONTH_NAMES` (linha ~39), adicionar:

```js
const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
```

- [ ] **Step 3: `piRef` junto aos outros refs**

Na linha 121 (`const page2Ref = useRef(null);`), adicionar logo abaixo:

```js
    const piRef = useRef(null);
```

- [ ] **Step 4: Dados derivados pra PI**

Logo depois de `const useSinglePage = mapRows.length <= MAX_ROWS_SINGLE_PAGE;` (linha ~238, já existe no arquivo), adicionar:

```js
    // PI só faz sentido com uma duração/valor/desconto únicos pro documento
    // inteiro — se houver mais de uma segundagem ativa ao mesmo tempo, o
    // botão fica desabilitado em vez de tentar adivinhar qual usar (ver spec).
    const activeSegundos = secondsCards.length === 1 ? secondsCards[0].segundos : null;
    const canExportPI = activeSegundos !== null;
    const piDuracaoLabel = activeSegundos ? `${activeSegundos}"` : '';
    const piDescontoPercent = activeSegundos ? (activeSeconds[activeSegundos]?.discount || 0) : 0;
    const piValorTabela = activeSegundos ? totalMap[activeSegundos] : 0;
    const piTotalMidia = piValorTabela * (1 - piDescontoPercent / 100);
    const piMonthLabelShort = `${MONTH_ABBR[mapMonthIndex]}/${String(mapYear).slice(-2)}`;
    const piRows = enrichedRows.map(r => ({
        sigla: r.sigla,
        programa: r.programa,
        dias: r.dias,
        marks: r.marks,
        insercoes: r.insercoes,
        unit: activeSegundos ? r[`unitValor${activeSegundos}`] : 0,
        total: activeSegundos ? r[`valor${activeSegundos}`] : 0,
    }));
```

- [ ] **Step 5: `handleExportPI`**

Logo depois do fechamento de `handleExportPdf` (depois da linha `};` que fecha essa função, atualmente linha 407), adicionar:

```js
    const handleExportPI = async () => {
        if (!piRef.current || !canExportPI) return;
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

            const img = await htmlToImage.toJpeg(piRef.current, exportOpts);
            pdf.addImage(img, 'JPEG', 0, 0, widthMm, heightMm);

            const pdfBlob = pdf.output('blob');
            const fileName = `PI-${selectedPraca}-${MONTH_ABBR[mapMonthIndex]}${mapYear}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (navigator.canShare?.({ files: [pdfFile] })) {
                try {
                    await navigator.share({ files: [pdfFile], title: 'PI - Pedido de Inserção' });
                } catch (shareErr) {
                    if (shareErr?.name === 'AbortError') return; // usuário cancelou o menu de compartilhar
                    pdf.save(fileName);
                }
            } else {
                pdf.save(fileName);
            }

            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            alert('Erro ao gerar PI. Tente novamente.');
        }
    };
```

- [ ] **Step 6: Render oculto de `PISlide`**

No JSX, logo depois do `</div>` que fecha `.slide-scale-wrapper` (linha ~731, o `</div>` antes de `</>` que fecha o fragmento do formato slide), adicionar:

```jsx
                        <div style={{ position: 'fixed', top: 0, left: '-10000px', pointerEvents: 'none' }}>
                            <div ref={piRef}>
                                <PISlide
                                    pracaKey={selectedPraca}
                                    pracaLabel={pracaLabel}
                                    monthLabelLong={monthLabel}
                                    monthLabelShort={piMonthLabelShort}
                                    year={mapYear}
                                    monthIndex={mapMonthIndex}
                                    daysInMonth={mapDaysInMonth}
                                    rows={piRows}
                                    titulosUsados={titulosUsados}
                                    duracaoLabel={piDuracaoLabel}
                                    descontoPercent={piDescontoPercent}
                                    valorTabela={piValorTabela}
                                    totalMidia={piTotalMidia}
                                />
                            </div>
                        </div>
```

- [ ] **Step 7: Botão dentro do popup de exportação**

Substituir o bloco atual (linhas 721-730):

```jsx
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
```

por:

```jsx
                            {exportPreviewOpen && (
                                <div className="export-preview-actions">
                                    <button
                                        type="button"
                                        className="export-preview-share-btn"
                                        onClick={handleExportPdf}
                                    >
                                        {isCopied ? <Check size={18} /> : <FileDown size={18} />}
                                        Exportar PDF
                                    </button>
                                    <button
                                        type="button"
                                        className="export-preview-share-btn"
                                        onClick={handleExportPI}
                                        disabled={!canExportPI}
                                        title={canExportPI ? 'Exportar para PI' : 'Ative só uma segundagem pra exportar a PI'}
                                    >
                                        <FileSpreadsheet size={18} />
                                        Exportar para PI
                                    </button>
                                </div>
                            )}
```

- [ ] **Step 8: Botão na barra flutuante (mobile/desktop)**

Na barra flutuante (linhas 748-778), substituir o bloco inteiro do ternário `formato === 'card' ? ... : ...` (mantendo os dois branches existentes intactos) adicionando um botão novo logo depois dele:

```jsx
                        {formato === 'card' ? (
                            <button
                                className="mobile-copy-btn"
                                onClick={handleCopyImage}
                                style={{ backgroundColor: isCopied ? 'rgba(10,199,91,0.85)' : '' }}
                                title="Copiar Imagem"
                            >
                                {isCopied ? <Check size={22} /> : <Camera size={22} />}
                            </button>
                        ) : (
                            <button
                                className="mobile-copy-btn"
                                onClick={() => {
                                    // Este botão é estilizado (e o popup de resumo só existe)
                                    // dentro do breakpoint mobile — no desktop, sem essa
                                    // checagem, ele injetaria o popup sem CSS e o usuário
                                    // perderia o download direto que já existia antes.
                                    const isMobileBreakpoint = window.matchMedia(
                                        '(max-width: 768px), (max-height: 500px) and (orientation: landscape)'
                                    ).matches;
                                    if (isMobileBreakpoint) {
                                        setExportPreviewOpen(true);
                                    } else {
                                        handleExportPdf();
                                    }
                                }}
                                title="Ver resumo e exportar"
                            >
                                <FileDown size={22} />
                            </button>
                        )}
                        {formato !== 'card' && (
                            <button
                                className="mobile-copy-btn"
                                onClick={handleExportPI}
                                disabled={!canExportPI}
                                title={canExportPI ? 'Exportar para PI' : 'Ative só uma segundagem pra exportar a PI'}
                            >
                                <FileSpreadsheet size={22} />
                            </button>
                        )}
```

(o botão novo fica fora do ternário `formato === 'card' ? ... : ...` que já existe — ele só aparece no formato Slide, então a condição é `formato !== 'card'` diretamente, não duplicando o botão Card.)

- [ ] **Step 9: CSS — reposicionar `.export-preview-share-btn` dentro de um wrapper**

Em `teste/src/index.css`, a regra `.export-preview-share-btn` (dentro do media query mobile, por volta da linha 487) atualmente tem posicionamento fixo próprio. Trocar:

```css
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
```

por (o posicionamento fixo sai daqui e vai pro wrapper novo, já que agora há 2 botões lado a lado):

```css
  .export-preview-actions {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
    display: flex;
    gap: 0.6rem;
  }

  .export-preview-share-btn {
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

  .export-preview-share-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
```

- [ ] **Step 10: CSS — estado desabilitado do botão flutuante**

Em `teste/src/index.css`, logo depois da regra `.mobile-copy-btn` (por volta da linha 377, antes de `.mobile-home-btn`), adicionar:

```css
  .mobile-copy-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
```

- [ ] **Step 11: Build**

Run: `cd teste && npm run build`
Expected: build verde, sem erros.

- [ ] **Step 12: Lint**

Run: `cd teste && npm run lint`
Expected: sem novos erros (o warning pré-existente em `PatrocinioPage.jsx` sobre `useEffect` deps não é desta mudança e pode ser ignorado).

- [ ] **Step 13: Commit**

```bash
git add teste/src/pages/MidiaAvulsaPage.jsx teste/src/index.css
git commit -m "feat: wire the PI PDF export button into Mídia Avulsa (Slide)"
```

---

### Task 3: Verificação end-to-end (Playwright)

**Files:**
- Nenhum arquivo de produto — só verificação manual/scriptada, sem artefato de teste permanente no repositório (mesmo padrão das tasks finais dos planos anteriores deste projeto).

**Interfaces:**
- Consumes: o app completo (Tasks 1-2).
- Produces: nada — task terminal.

- [ ] **Step 1: Subir o dev server**

```bash
cd teste && npm run dev -- --port 5195
```

- [ ] **Step 2: Verificar com Playwright (script único, cobrindo todos os pontos abaixo)**

Usar Chromium headless (`/opt/pw-browsers/chromium`), viewport mobile (ex. iPhone 13, 390×844) e depois desktop (1440×900). Usar SEMPRE siglas reais confirmadas nos dados carregados (ex. `AUTO`, `BIGB`, `BOMS`, `BPRA` — nunca inventar uma sigla, ela não vai casar com nada e o teste passa silenciosamente errado).

Roteiro:
1. Abrir o app, ir em "Mídia Avulsa" → formato "Slide".
2. Adicionar 2 programas reais ao mapa (`AUTO`, `BIGB`) e marcar pelo menos 1 dia em cada um com o título ativo (letra `A`).
3. Com a segundagem padrão (só 30s ativo — estado inicial do app), confirmar que o botão "Exportar para PI" (tanto o da barra flutuante quanto o de dentro do popup "Ver resumo e exportar") está **habilitado** (`disabled` ausente/false).
4. Ativar também a segundagem 15s (2 segundagens ativas simultaneamente). Confirmar que **ambos** os botões "Exportar para PI" ficam **desabilitados** (`disabled` true).
5. Desativar a 15s de volta (só 30s ativo). Confirmar que os botões voltam a ficar habilitados.
6. Clicar em "Exportar para PI" (viewport mobile, dentro do popup) com um listener de `page.on('download', ...)` armado — como `navigator.share` não existe no Chromium headless, o fluxo cai pro fallback `pdf.save()`, que dispara um evento de download real e capturável (confirmado nesta mesma sessão, ao verificar o Task 5 do plano anterior). Confirmar que o download dispara com nome de arquivo no padrão `PI-rio_verde-<mês><ano>.pdf` (ex. `PI-rio_verde-set2026.pdf`, ajustando o mês pro mês corrente do teste).
7. Repetir o clique em viewport desktop (1440×900), usando o botão da barra flutuante (fora do popup — nesse viewport o popup nem existe/abre). Confirmar novo evento de `download` com o mesmo padrão de nome.
8. Antes de exportar, capturar via `page.evaluate` os valores computados no React (não é possível ler direto o state, então: ler o texto renderizado dos "Cards de Preço" na sidebar pra confirmar visualmente o `Total: R$ ...` da segundagem 30s ativa) e comparar com a soma manual esperada a partir dos 2 programas marcados — não precisa bater com precisão de centavos (arredondamento), só confirmar que não está zerado nem visivelmente errado.
9. Tirar um screenshot do `piRef` renderizado (ex. via `page.locator(...).screenshot()` no elemento oculto, ou temporariamente remover o `left: -10000px` inline via `page.evaluate` só para o screenshot) e confirmar visualmente, por inspeção, que aparecem: cabeçalho com a praça, bloco da emissora (Rio Verde), tabela de títulos com a letra `A` preenchida, grade de dias com as 2 siglas e suas marcas, bloco de valores no canto inferior direito, e as 3 linhas de assinatura — sem depender de comparação pixel-a-pixel com o PDF de referência.

- [ ] **Step 3: Reportar resultado**

Se algum item do roteiro falhar, corrigir o código (Task 1 ou 2, conforme o caso) antes de considerar o plano concluído — não há uma Task 4 de correção; ajustes voltam pra Task 1/2 diretamente já que ainda estamos na primeira passada de implementação.
