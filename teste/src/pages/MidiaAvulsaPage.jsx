import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings2, Check, Camera, Plus, Trash2, Home, FileDown, X } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import MidiaAvulsaCard from '../components/MidiaAvulsaCard';
import MapaInsercoes from '../components/MapaInsercoes';
import MapaInsercoesSemanal from '../components/MapaInsercoesSemanal';
import ResumoSlidePage from '../components/ResumoSlidePage';
import { getAllowedWeekdays, markQuantity } from '../utils/weekLock';
import { computeTitulosUsados } from '../utils/titulos';

const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9,-]+/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const PRACAS = [
    { key: 'goiania', label: 'GOIÂNIA' },
    { key: 'anapolis', label: 'ANÁPOLIS' },
    { key: 'rio_verde', label: 'RIO VERDE' },
    { key: 'luziania', label: 'LUZIÂNIA' },
    { key: 'itumbiara', label: 'ITUMBIARA' },
    { key: 'catalao', label: 'CATALÃO' },
    { key: 'porangatu', label: 'PORANGATU' },
    { key: 'jatai', label: 'JATAÍ' },
];

const SECONDS_OPTIONS = [10, 15, 30];
const MAX_ROWS = 13;
// Acima disso, tabela + resumo não cabem numa página só — o resumo (visualizações,
// preços, observações) vira uma 2ª página.
const MAX_ROWS_SINGLE_PAGE = 8;

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getNextMonths = () => {
    const currentMonthIdx = new Date().getMonth();
    return Array.from({ length: 4 }).map((_, i) => {
        const idx = (currentMonthIdx + i) % 12;
        return {
            label: MONTH_NAMES[idx],
            offset: i === 0 ? '' : `_${i + 1}`
        };
    });
};

// Resolve um offset ('', '_2', '_3', '_4') pro mês/ano real e nº de dias daquele mês,
// a partir de hoje — mesmo índice usado em getNextMonths().
const resolveMonthYear = (offset) => {
    const i = offset === '' ? 0 : parseInt(offset.slice(1), 10) - 1;
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthIndex = base.getMonth();
    const year = base.getFullYear();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return { monthIndex, year, daysInMonth, label: MONTH_NAMES[monthIndex] };
};

// Toggle switch component
const Toggle = ({ checked, onChange }) => (
    <div
        onClick={onChange}
        style={{
            width: '40px', height: '22px', borderRadius: '11px',
            background: checked ? 'var(--primary)' : '#cbd5e1',
            cursor: 'pointer', position: 'relative',
            transition: 'background 0.2s', flexShrink: 0,
        }}
    >
        <div style={{
            position: 'absolute', top: '3px',
            left: checked ? '21px' : '3px',
            width: '16px', height: '16px',
            background: 'white', borderRadius: '50%',
            transition: 'left 0.18s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
    </div>
);

export default function MidiaAvulsaPage({ onBack, active }) {
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState({ programas: [], patrocinios: [] });

    const [selectedPraca, setSelectedPraca] = useState('rio_verde');
    const [availableMonths] = useState(getNextMonths());
    const [selectedMonthOffset, setSelectedMonthOffset] = useState('');
    const [tableRows, setTableRows] = useState([]);
    const [formato, setFormato] = useState('card'); // 'card' | 'slide'
    const [titulos, setTitulos] = useState([{ letra: 'A', nome: 'Campanha' }]);
    const [tituloAtivo, setTituloAtivo] = useState('A');
    // Popup de "Ver resumo e exportar" no formato slide (mobile) — mostra a
    // grade desktop (page1Ref/page2Ref) num overlay de tela cheia, em vez de
    // trocar a página inteira de layout como o mecanismo antigo fazia.
    const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
    const [mapRows, setMapRows] = useState([]); // [{ sigla, marks: { [day]: string } }] — usado no formato slide

    // Searchbox state
    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);
    const [addSigla, setAddSigla] = useState('');
    const [addInsercoes, setAddInsercoes] = useState(1);

    // seconds cards
    const [activeSeconds, setActiveSeconds] = useState({
        10: { active: false, discount: 0 },
        15: { active: false, discount: 0 },
        30: { active: true, discount: 0 },
    });

    const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const cardRef = useRef(null);
    const page1Ref = useRef(null);
    const page2Ref = useRef(null);

    useEffect(() => {
        fetchAllSheetData().then(res => {
            setDb(res);
            setLoading(false);
        });
    }, []);

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

    // Ao trocar de mês, remove marcações de dias que não existem no novo mês (ex: dia 31 num mês de 30)
    useEffect(() => {
        const { daysInMonth } = resolveMonthYear(selectedMonthOffset);
        setMapRows(prev => prev.map(row => ({
            ...row,
            marks: Object.fromEntries(Object.entries(row.marks).filter(([d]) => Number(d) <= daysInMonth)),
        })));
    }, [selectedMonthOffset]);

    // --- Derived data ---
    const pracaLabel = PRACAS.find(p => p.key === selectedPraca)?.label || selectedPraca;
    const monthLabel = availableMonths.find(m => m.offset === selectedMonthOffset)?.label || '';
    const { monthIndex: mapMonthIndex, year: mapYear, daysInMonth: mapDaysInMonth } = resolveMonthYear(selectedMonthOffset);

    const siglasOptions = db.programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    // No formato slide, as "inserções" de cada linha são derivadas da soma das quantidades
    // marcadas no mapa (ex.: "A"=1, "2B"=2), em vez do número digitado na sidebar (formato
    // card). O objeto `marks` segue junto (usado pela grade do mapa) e mantém o mesmo índice
    // de mapRows.
    const sourceRows = formato === 'slide'
        ? mapRows.map(r => ({
            sigla: r.sigla,
            insercoes: Object.values(r.marks).reduce((s, mark) => s + markQuantity(mark), 0),
            marks: r.marks,
        }))
        : tableRows;

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

    const titulosUsados = computeTitulosUsados(titulos, mapRows);

    const total30 = enrichedRows.reduce((s, r) => s + r.valor30, 0);
    const total15 = enrichedRows.reduce((s, r) => s + r.valor15, 0);
    const total10 = enrichedRows.reduce((s, r) => s + r.valor10, 0);
    const totalMap = { 30: total30, 15: total15, 10: total10 };

    const isRioVerde = selectedPraca === 'rio_verde';
    const totalVisualizacoes = isRioVerde
        ? enrichedRows.reduce((s, r) => s + r.audienciaRvd * r.insercoes, 0)
        : 0;

    const secondsCards = SECONDS_OPTIONS
        .filter(s => activeSeconds[s]?.active)
        .map(s => ({
            segundos: s,
            total: totalMap[s],
            descontoPercent: activeSeconds[s]?.discount || 0,
        }));

    const numVisibleCards = secondsCards.length;
    const useSinglePage = mapRows.length <= MAX_ROWS_SINGLE_PAGE;

    // --- Handlers ---
    const handleSelectSigla = (p) => {
        setAddSigla(p.sigla);
        setBusca(`${p.sigla} — ${p.programa}`);
        setBuscaFocused(false);
    };

    const handleAddRow = () => {
        if (!addSigla || tableRows.length >= MAX_ROWS) return;
        setTableRows(prev => [...prev, { sigla: addSigla, insercoes: Number(addInsercoes) || 1 }]);
        setBusca('');
        setAddSigla('');
        setAddInsercoes(1);
    };

    const handleDeleteRow = (idx) => {
        setTableRows(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAddMapRow = (sigla) => {
        if (!sigla || mapRows.length >= MAX_ROWS) return;
        setMapRows(prev => [...prev, { sigla, marks: {} }]);
    };

    const handleDeleteMapRow = (idx) => {
        setMapRows(prev => prev.filter((_, i) => i !== idx));
    };

    // markStr === '' remove a marcação do dia; senão seta (já validado no componente, ex.: "A", "2B").
    const handleSetDayMark = (rowIdx, day, markStr) => {
        setMapRows(prev => prev.map((row, i) => {
            if (i !== rowIdx) return row;
            const marks = { ...row.marks };
            if (!markStr) delete marks[day];
            else marks[day] = markStr;
            return { ...row, marks };
        }));
    };

    const handleReorderRows = (fromIdx, toIdx) => {
        if (fromIdx === toIdx) return;
        setMapRows(prev => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
    };

    // Copia, pra TODOS os programas do mapa, as marcações da semana anterior (mondayDay - 7)
    // pra semana que começa em mondayDay, sobrescrevendo o que já estava marcado no destino.
    const handleReplicateWeek = (mondayDay) => {
        const { daysInMonth } = resolveMonthYear(selectedMonthOffset);
        setMapRows(prev => prev.map(row => {
            const marks = { ...row.marks };
            for (let d = mondayDay; d < mondayDay + 7 && d <= daysInMonth; d++) {
                const sourceDay = d - 7;
                if (sourceDay < 1) continue;
                const sourceMark = row.marks[sourceDay];
                if (sourceMark) marks[d] = sourceMark;
                else delete marks[d];
            }
            return { ...row, marks };
        }));
    };

    const handleAddTitulo = (letra) => {
        setTitulos(prev => [...prev, { letra, nome: '' }]);
    };

    const handleRenameTitulo = (letra, novoNome) => {
        setTitulos(prev => prev.map(t => (t.letra === letra ? { ...t, nome: novoNome } : t)));
    };

    const toggleSeconds = (s) => {
        const activeCount = Object.values(activeSeconds).filter(v => v.active).length;
        if (activeSeconds[s]?.active && activeCount <= 1) return; // Cannot disable last card

        setActiveSeconds(prev => ({
            ...prev,
            [s]: { ...prev[s], active: !prev[s]?.active },
        }));
    };

    const setDiscount = (s, val) => {
        setActiveSeconds(prev => ({
            ...prev,
            [s]: { ...prev[s], discount: val === '' ? '' : Number(val) },
        }));
    };

    const handleCopyImage = async () => {
        if (!cardRef.current) return;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 400);
        const htmlToImage = await import('html-to-image');
        try {
            const blob = await htmlToImage.toBlob(cardRef.current, { quality: 1, pixelRatio: 3 });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            try {
                const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
                const link = document.createElement('a');
                link.download = 'card-midia-avulsa.png';
                link.href = dataUrl;
                link.click();
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch {
                alert('Erro ao salvar imagem. Tente novamente.');
            }
        }
    };

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

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#5A1CDB', fontSize: '1rem', fontWeight: 600 }}>
            Carregando dados...
        </div>
    );

    const pracasOptions = [...PRACAS].sort((a, b) => {
        if (a.key === 'rio_verde') return -1;
        if (b.key === 'rio_verde') return 1;
        return a.label.localeCompare(b.label, 'pt-BR');
    });

    const inputStyle = {
        width: '100%', padding: '0.55rem 0.75rem',
        border: '1.5px solid #e2e8f0', borderRadius: '8px',
        fontSize: '0.9rem', fontFamily: "'Outfit', sans-serif",
        outline: 'none', boxSizing: 'border-box', background: 'white',
    };

    const atLimit = tableRows.length >= MAX_ROWS;

    return (
        <div className="app-container midia-avulsa-app">
            {isMobileTrayOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileTrayOpen(false)} />
            )}

            <aside className={`sidebar ${isMobileTrayOpen ? 'open' : ''}`}>
                <div className="sidebar-header-mobile">
                    <h2 style={{ marginTop: 0, marginBottom: 0 }}>Mídia Avulsa</h2>
                    <button className="close-tray-btn" onClick={() => setIsMobileTrayOpen(false)}>
                        <Check size={24} color="#111" />
                    </button>
                </div>

                <button onClick={onBack} className="desktop-only" style={{
                    alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#5A1CDB', fontWeight: 700, fontSize: '0.85rem',
                    padding: '0 0 1rem', fontFamily: "'Outfit', sans-serif",
                }}>
                    <ArrowLeft size={16} /> Início
                </button>

                <div className="form-group">
                    <label>Formato</label>
                    <div className="segmented-control">
                        <button
                            type="button"
                            className={formato === 'card' ? 'active' : ''}
                            onClick={() => setFormato('card')}
                        >
                            Card
                        </button>
                        <button
                            type="button"
                            className={formato === 'slide' ? 'active' : ''}
                            onClick={() => setFormato('slide')}
                        >
                            Slide
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Mês</label>
                        <select className="form-control" value={selectedMonthOffset} onChange={e => setSelectedMonthOffset(e.target.value)}>
                            {availableMonths.map(m => <option key={m.offset} value={m.offset}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Praça</label>
                        <select className="form-control" value={selectedPraca} onChange={e => setSelectedPraca(e.target.value)}>
                            {pracasOptions.map(pr => <option key={pr.key} value={pr.key}>{pr.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table Builder — só no formato Card; no Slide, os programas são adicionados direto na grade do mapa */}
                {formato === 'card' && (
                <>
                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
                    Programas {atLimit && <span style={{ fontSize: '0.7rem', color: '#e74c3c', fontWeight: 600 }}>(limite atingido)</span>}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
                    {/* Searchbox */}
                    <div style={{ flex: 2, position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem', color: '#444' }}>Sigla / Programa</label>
                        <input
                            type="text"
                            placeholder="Buscar por sigla..."
                            value={busca}
                            style={inputStyle}
                            onChange={e => { setBusca(e.target.value); setAddSigla(''); }}
                            onFocus={() => setBuscaFocused(true)}
                            onBlur={() => setTimeout(() => setBuscaFocused(false), 180)}
                        />
                        {buscaFocused && filteredSiglas.length > 0 && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                background: 'white', border: '1.5px solid #e2e8f0',
                                borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
                                zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            }}>
                                {filteredSiglas.map(p => (
                                    <div
                                        key={p.sigla}
                                        onMouseDown={() => handleSelectSigla(p)}
                                        style={{
                                            padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem',
                                            borderBottom: '1px solid #f1f5f9',
                                            display: 'flex', gap: '0.4rem', alignItems: 'baseline',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8f5ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '2.5rem' }}>{p.sigla}</span>
                                        <span style={{ color: '#555', fontSize: '0.78rem' }}>{p.programa}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inserções */}
                    <div style={{ flex: '0 0 64px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem', color: '#444' }}>Ins.</label>
                        <input
                            type="number" min="1" style={{ ...inputStyle, padding: '0.55rem 0.4rem' }}
                            value={addInsercoes}
                            onChange={e => setAddInsercoes(e.target.value)}
                        />
                    </div>

                    {/* Add button */}
                    <button
                        onClick={handleAddRow}
                        disabled={!addSigla || atLimit}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.55rem 0.75rem', borderRadius: '8px',
                            background: (!addSigla || atLimit) ? '#e2e8f0' : 'var(--primary)',
                            color: (!addSigla || atLimit) ? '#94a3b8' : 'white',
                            border: 'none', cursor: (!addSigla || atLimit) ? 'not-allowed' : 'pointer', flexShrink: 0,
                        }}
                    >
                        <Plus size={18} />
                    </button>
                </div>

                {/* Added Rows List */}
                {tableRows.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        {tableRows.map((row, idx) => {
                            const prog = db.programas.find(p => String(p.sigla).trim() === String(row.sigla).trim()) || {};
                            return (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center',
                                    padding: '0.35rem 0.6rem',
                                    background: idx % 2 === 0 ? '#f8f5ff' : 'white',
                                    borderRadius: '6px', marginBottom: '0.2rem', fontSize: '0.82rem',
                                }}>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '2.5rem' }}>{row.sigla}</span>
                                    <span style={{ color: '#555', flex: 1, marginLeft: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                        {prog.programa || ''}
                                    </span>
                                    <span style={{ color: '#888', marginLeft: '0.5rem', flexShrink: 0, fontSize: '0.78rem' }}>{row.insercoes}×</span>
                                    <button
                                        onClick={() => handleDeleteRow(idx)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.3rem', marginLeft: '0.3rem', color: '#e74c3c' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                </>
                )}

                {/* Seconds Cards */}
                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Cards de Preço</h3>

                {SECONDS_OPTIONS.map(s => {
                    const isActive = activeSeconds[s]?.active;
                    return (
                        <div key={s} style={{
                            background: isActive ? '#f8f5ff' : '#f8f8f8',
                            border: `1.5px solid ${isActive ? 'var(--primary)' : '#e2e8f0'}`,
                            borderRadius: '10px', padding: '0.7rem 0.9rem',
                            marginBottom: '0.6rem', transition: 'border-color 0.15s',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isActive ? '0.6rem' : 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Toggle checked={isActive} onChange={() => toggleSeconds(s)} />
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? 'var(--primary)' : '#94a3b8' }}>
                                        {s} segundos
                                    </span>
                                </div>
                                {isActive && (
                                    <span style={{ fontSize: '0.73rem', color: '#555' }}>
                                        Total: <b>R$ {Math.round(totalMap[s]).toLocaleString('pt-BR')}</b>
                                    </span>
                                )}
                            </div>
                            {isActive && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Desconto (%)</label>
                                    <input
                                        type="number" min="0" max="100"
                                        value={activeSeconds[s]?.discount ?? ''}
                                        onChange={e => setDiscount(s, e.target.value)}
                                        onFocus={() => { if ((activeSeconds[s]?.discount ?? 0) === 0) setDiscount(s, ''); }}
                                        onBlur={() => { if (activeSeconds[s]?.discount === '') setDiscount(s, 0); }}
                                        style={{ ...inputStyle, width: '80px', padding: '0.3rem 0.5rem' }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                <div style={{ paddingBottom: '2rem' }} />
            </aside>

            <main className="main-content">
                {formato === 'card' ? (
                    <div className="preview-scale-wrapper">
                        <div ref={cardRef}>
                            <MidiaAvulsaCard
                                praca={pracaLabel}
                                tableRows={enrichedRows}
                                secondsCards={secondsCards}
                                numVisibleCards={numVisibleCards}
                                totalVisualizacoes={totalVisualizacoes}
                                month={monthLabel}
                            />
                        </div>
                    </div>
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

                <div className="mobile-floating-actions">
                    <button className="mobile-home-btn" onClick={onBack} title="Início">
                        <Home size={22} />
                    </button>
                    <button className="mobile-tray-toggle" onClick={() => setIsMobileTrayOpen(true)}>
                        <Settings2 size={24} /> Editar Card
                    </button>
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
                            onClick={() => setExportPreviewOpen(true)}
                            title="Ver resumo e exportar"
                        >
                            <FileDown size={22} />
                        </button>
                    )}
                </div>
            </main>

            {/* Camera flash overlay */}
            {isFlashing && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'white', pointerEvents: 'none',
                    animation: 'cameraFlash 0.45s ease-out forwards',
                }} />
            )}
        </div>
    );
}
