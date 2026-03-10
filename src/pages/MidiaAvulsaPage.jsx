import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings2, Check, Camera, Plus, Trash2, Home } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import MidiaAvulsaCard from '../components/MidiaAvulsaCard';

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

export default function MidiaAvulsaPage({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState({ programas: [], patrocinios: [] });

    const [selectedPraca, setSelectedPraca] = useState('rio_verde');
    const [availableMonths] = useState(getNextMonths());
    const [selectedMonthOffset, setSelectedMonthOffset] = useState('');
    const [tableRows, setTableRows] = useState([]);

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

    useEffect(() => {
        fetchAllSheetData().then(res => {
            setDb(res);
            setLoading(false);
        });
    }, []);

    // --- Derived data ---
    const pracaLabel = PRACAS.find(p => p.key === selectedPraca)?.label || selectedPraca;
    const monthLabel = availableMonths.find(m => m.offset === selectedMonthOffset)?.label || '';

    const siglasOptions = db.programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    const enrichedRows = tableRows.map(row => {
        const prog = db.programas.find(p => String(p.sigla).trim() === String(row.sigla).trim()) || {};
        const colKey = selectedMonthOffset ? `${selectedPraca}${selectedMonthOffset}` : selectedPraca;
        const valor30 = parseNum(prog[colKey]) * row.insercoes;
        const coef15 = parseNum(prog.coeficiente_15);
        const coef10 = parseNum(prog.coeficiente_10);
        return {
            programa: prog.programa || row.sigla,
            dias: prog.dias || '—',
            horario: prog.horario || '—',
            insercoes: row.insercoes,
            valor30,
            // Correct formula: valor - (valor * (1 - coeficiente))
            valor15: valor30 - (valor30 * (1 - coef15)),
            valor10: valor30 - (valor30 * (1 - coef10)),
            audienciaRvd: parseNum(prog.audiencia_rvd),
        };
    });

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
        <div className="app-container">
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

                {/* Table Builder */}
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

                <div className="mobile-floating-actions">
                    <button className="mobile-home-btn" onClick={onBack} title="Início">
                        <Home size={22} />
                    </button>
                    <button className="mobile-tray-toggle" onClick={() => setIsMobileTrayOpen(true)}>
                        <Settings2 size={24} /> Editar Card
                    </button>
                    <button
                        className="mobile-copy-btn"
                        onClick={handleCopyImage}
                        style={{ backgroundColor: isCopied ? 'rgba(10,199,91,0.85)' : '' }}
                        title="Copiar Imagem"
                    >
                        {isCopied ? <Check size={22} /> : <Camera size={22} />}
                    </button>
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
