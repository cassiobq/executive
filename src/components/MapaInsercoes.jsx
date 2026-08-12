import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom, Seg, Ter, Qua, Qui, Sex, Sáb (getDay() index)

// Slide (paisagem) — página 2: grade de calendário editável. O usuário clica nas células
// pra marcar em quais dias cada programa vai ao ar. É ao mesmo tempo a interface de
// entrada de dados e a peça exportada pro cliente (por isso os controles de edição têm
// a classe "no-export", excluída na hora de gerar a imagem/PDF).
const MapaInsercoes = ({
    pracaLabel,
    monthLabel,
    year,
    monthIndex, // 0-11
    daysInMonth,
    mapRows,
    programas,
    onToggleDay,
    onAddRow,
    onDeleteRow,
    maxRows,
}) => {
    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);

    const siglasOptions = programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const atLimit = mapRows.length >= maxRows;

    const gridTemplate = `150px repeat(${daysInMonth}, 1fr) 44px`;

    const handlePick = (sigla) => {
        onAddRow(sigla);
        setBusca('');
        setBuscaFocused(false);
    };

    return (
        <div style={{
            width: '1000px',
            aspectRatio: '297 / 210',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            padding: '2rem 2.4rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            color: 'var(--primary)',
            fontFamily: "'Outfit', sans-serif",
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', flex: 'none' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--primary)' }}>
                    MAPA DE INSERÇÕES
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    PRAÇA {pracaLabel}
                </div>
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: 'rgba(90,28,219,0.08)', color: 'var(--primary)',
                    padding: '0.2rem 0.6rem', borderRadius: '50px',
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '1px',
                }}>
                    {monthLabel}/{year}
                </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Day numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, fontSize: '0.5rem', fontWeight: 700, color: '#111' }}>
                    <div />
                    {days.map(d => (
                        <div key={d} style={{ textAlign: 'center', padding: '0.15rem 0' }}>{d}</div>
                    ))}
                    <div />
                </div>
                {/* Weekday letters */}
                <div style={{
                    display: 'grid', gridTemplateColumns: gridTemplate,
                    fontSize: '0.48rem', fontWeight: 600, color: '#666',
                    borderBottom: '2px solid var(--primary)', paddingBottom: '0.25rem', marginBottom: '0.15rem',
                }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#111', textTransform: 'uppercase' }}>Programa</div>
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                            <div key={d} style={{ textAlign: 'center', color: isWeekend ? '#999' : '#666' }}>
                                {WEEKDAY_LETTERS[dow]}
                            </div>
                        );
                    })}
                    <div style={{ textAlign: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#111' }}>QTD</div>
                </div>

                {/* Program rows */}
                {mapRows.map((row, rowIdx) => {
                    const prog = programas.find(p => String(p.sigla).trim() === String(row.sigla).trim()) || {};
                    return (
                        <div key={rowIdx} style={{
                            display: 'grid', gridTemplateColumns: gridTemplate,
                            alignItems: 'center', minHeight: '22px',
                            backgroundColor: rowIdx % 2 === 0 ? 'rgba(90,28,219,0.04)' : 'transparent',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
                                <button
                                    className="no-export"
                                    onClick={() => onDeleteRow(rowIdx)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: 0, color: '#e74c3c', flexShrink: 0, display: 'flex',
                                    }}
                                    title="Remover"
                                >
                                    <Trash2 size={10} />
                                </button>
                                <span style={{
                                    fontSize: '0.56rem', fontWeight: 700, color: '#333',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }} title={prog.programa || row.sigla}>
                                    {prog.programa || row.sigla}
                                </span>
                            </div>
                            {days.map(d => {
                                const marked = row.days.includes(d);
                                const dow = new Date(year, monthIndex, d).getDay();
                                const isWeekend = dow === 0 || dow === 6;
                                return (
                                    <div
                                        key={d}
                                        onClick={() => onToggleDay(rowIdx, d)}
                                        style={{
                                            height: '18px', margin: '1px',
                                            borderRadius: '3px', cursor: 'pointer',
                                            backgroundColor: marked ? 'var(--primary)' : (isWeekend ? '#f1eefc' : '#f4f4f6'),
                                        }}
                                    />
                                );
                            })}
                            <div style={{ textAlign: 'center', fontSize: '0.56rem', fontWeight: 800, color: 'var(--primary)' }}>
                                {row.days.length}
                            </div>
                        </div>
                    );
                })}

                {/* Add row */}
                <div className="no-export" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', position: 'relative' }}>
                    <input
                        type="text"
                        placeholder={atLimit ? 'Limite de programas atingido' : 'Buscar sigla/programa...'}
                        value={busca}
                        disabled={atLimit}
                        onChange={e => setBusca(e.target.value)}
                        onFocus={() => setBuscaFocused(true)}
                        onBlur={() => setTimeout(() => setBuscaFocused(false), 180)}
                        style={{
                            flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.7rem',
                            border: '1.5px solid #e2e8f0', borderRadius: '6px',
                            fontFamily: "'Outfit', sans-serif", outline: 'none',
                        }}
                    />
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: '#e2e8f0', color: '#94a3b8', flexShrink: 0,
                    }}>
                        <Plus size={14} />
                    </div>
                    {buscaFocused && busca && filteredSiglas.length > 0 && (
                        <div style={{
                            position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: '30px',
                            background: 'white', border: '1.5px solid #e2e8f0',
                            borderRadius: '8px', maxHeight: '160px', overflowY: 'auto',
                            zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        }}>
                            {filteredSiglas.map(p => (
                                <div
                                    key={p.sigla}
                                    onMouseDown={() => handlePick(p.sigla)}
                                    style={{
                                        padding: '0.4rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem',
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex', gap: '0.4rem', alignItems: 'baseline',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8f5ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '2.5rem' }}>{p.sigla}</span>
                                    <span style={{ color: '#555', fontSize: '0.72rem' }}>{p.programa}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapaInsercoes;
