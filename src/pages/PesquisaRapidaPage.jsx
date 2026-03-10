import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, CalendarDays, Check, Settings2, Home } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';

const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9,-]+/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const formatMoney = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default function PesquisaRapidaPage({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState({ programas: [], patrocinios: [] });

    const [selectedPraca, setSelectedPraca] = useState('rio_verde');
    const [availableMonths] = useState(getNextMonths());
    const [selectedMonthOffset, setSelectedMonthOffset] = useState('');

    // Searchbox state
    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);
    const [selectedProg, setSelectedProg] = useState(null);
    const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);

    useEffect(() => {
        fetchAllSheetData().then(res => {
            setDb(res);
            setLoading(false);
        });
    }, []);

    const pracasOptions = [...PRACAS].sort((a, b) => {
        if (a.key === 'rio_verde') return -1;
        if (b.key === 'rio_verde') return 1;
        return a.label.localeCompare(b.label, 'pt-BR');
    });

    const siglasOptions = db.programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    const handleSelectSigla = (p) => {
        setSelectedProg(p);
        setBusca(`${p.sigla} — ${p.programa}`);
        setBuscaFocused(false);
    };

    const inputStyle = {
        width: '100%', padding: '0.75rem',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontSize: '1rem', fontFamily: "'Outfit', sans-serif",
        outline: 'none', boxSizing: 'border-box', background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    };

    let valor30 = 0, valor15 = 0, valor10 = 0;

    if (selectedProg) {
        const colKey = selectedMonthOffset ? `${selectedPraca}${selectedMonthOffset}` : selectedPraca;
        valor30 = parseNum(selectedProg[colKey]);
        const coef15 = parseNum(selectedProg.coeficiente_15);
        const coef10 = parseNum(selectedProg.coeficiente_10);

        valor15 = valor30 - (valor30 * (1 - coef15));
        valor10 = valor30 - (valor30 * (1 - coef10));
    }

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#5A1CDB', fontSize: '1rem', fontWeight: 600 }}>
            Carregando dados...
        </div>
    );

    return (
        <div className="app-container">
            {isMobileTrayOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileTrayOpen(false)} />
            )}

            <aside className={`sidebar ${isMobileTrayOpen ? 'open' : ''}`}>
                <div className="sidebar-header-mobile">
                    <h2 style={{ marginTop: 0, marginBottom: 0 }}>Pesquisa Rápida</h2>
                    <button className="close-tray-btn" onClick={() => setIsMobileTrayOpen(false)}>
                        <Check size={24} color="#111" />
                    </button>
                </div>

                <button onClick={onBack} className="desktop-only" style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#5A1CDB', fontWeight: 700, fontSize: '0.9rem',
                    padding: '0 0 2rem', fontFamily: "'Outfit', sans-serif",
                }}>
                    <ArrowLeft size={18} /> Voltar ao Início
                </button>

                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E1B4B', margin: '0 0 1.5rem', letterSpacing: '-0.03em' }}>
                    Pesquisa Rápida
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                    Busque um programa para consultar instantaneamente os valores de 10s, 15s e 30s.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444' }}>Mês</label>
                        <select className="form-control" style={{ ...inputStyle, padding: '0.65rem' }} value={selectedMonthOffset} onChange={e => setSelectedMonthOffset(e.target.value)}>
                            {availableMonths.map(m => <option key={m.offset} value={m.offset}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444' }}>Praça</label>
                        <select className="form-control" style={{ ...inputStyle, padding: '0.65rem' }} value={selectedPraca} onChange={e => setSelectedPraca(e.target.value)}>
                            {pracasOptions.map(pr => <option key={pr.key} value={pr.key}>{pr.label}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: '#444' }}>
                        Sigla ou Nome do Programa
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Ex: JN, Bom Dia Brasil..."
                            value={busca}
                            style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            onChange={e => { setBusca(e.target.value); setSelectedProg(null); }}
                            onFocus={() => { setBusca(''); setSelectedProg(null); setBuscaFocused(true); }}
                            onBlur={() => setTimeout(() => setBuscaFocused(false), 200)}
                        />
                    </div>
                    {buscaFocused && filteredSiglas.length > 0 && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                            background: 'white', border: '1.5px solid #e2e8f0',
                            borderRadius: '12px', maxHeight: '250px', overflowY: 'auto',
                            zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        }}>
                            {filteredSiglas.map(p => (
                                <div
                                    key={p.sigla}
                                    onMouseDown={() => handleSelectSigla(p)}
                                    style={{
                                        padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8f5ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '3.5rem', fontSize: '1.05rem' }}>{p.sigla}</span>
                                    <span style={{ color: '#475569', fontWeight: 500 }}>{p.programa}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <main className="main-content">
                <div className="preview-scale-wrapper">
                    <div style={{ width: '100%', maxWidth: '420px', padding: '1rem' }}>
                        {selectedProg ? (
                            <div style={{
                                background: 'white', borderRadius: '24px', padding: '1.5rem', width: '100%',
                                boxShadow: '0 10px 30px rgba(90,28,219,0.08)', position: 'relative', overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', background: 'linear-gradient(90deg, #3A0CA8, #7B3FE4)' }} />

                                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                    <div style={{
                                        display: 'inline-block', background: '#f8f5ff', color: 'var(--primary)',
                                        padding: '0.5rem 1.2rem', borderRadius: '50px', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem'
                                    }}>
                                        {selectedProg.sigla}
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#1E1B4B', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                                        {selectedProg.programa}
                                    </h3>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', color: '#64748B', fontWeight: 500 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <CalendarDays size={18} color="var(--primary)" /> {selectedProg.dias || '—'}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Clock size={18} color="var(--primary)" /> {selectedProg.horario || '—'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {[
                                        { seg: 10, val: valor10, color: '#0ea5e9', bg: '#e0f2fe' },
                                        { seg: 15, val: valor15, color: '#8b5cf6', bg: '#ede9fe' },
                                        { seg: 30, val: valor30, color: '#f59e0b', bg: '#fef3c7' }
                                    ].map(item => (
                                        <div key={item.seg} style={{
                                            background: item.bg, borderRadius: '16px', padding: '1rem 1.2rem', textAlign: 'left',
                                            border: `2px solid ${item.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            transition: 'transform 0.2s', cursor: 'default'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                            <div style={{ color: item.color, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.1 }}>
                                                {item.seg} <br />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.8 }}>Segundos</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', color: '#1e293b' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>R$</span>
                                                <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                                    {formatMoney(item.val).split(',')[0]}
                                                </span>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                                    ,{formatMoney(item.val).split(',')[1]}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ background: '#e2e8f0', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <Search size={40} color="#cbd5e1" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1E1B4B' }}>Pesquise um programa</h3>
                                <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>Utilize o menu lateral para buscar pela sigla ou nome.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mobile-floating-actions">
                    <button className="mobile-home-btn" onClick={onBack} title="Início">
                        <Home size={22} />
                    </button>
                    <button className="mobile-tray-toggle" onClick={() => setIsMobileTrayOpen(true)}>
                        <Search size={22} /> Buscar Programa
                    </button>
                </div>
            </main>
        </div>
    );
}
