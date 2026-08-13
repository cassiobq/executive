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

// Tabela unificada (mapa + preços por secundagem): o usuário clica numa célula pra
// editá-la inline e digita uma letra maiúscula (opcionalmente prefixada por um
// número de repetições, ex. "2A") marcando a inserção daquele dia — é ao mesmo
// tempo a interface de entrada de dados e a peça exportada pro cliente (por isso os
// controles de edição têm a classe "no-export", excluída na hora de gerar a
// imagem/PDF). Em repouso cada célula é sempre um <div> (nunca um <input> parado),
// garantindo que o html-to-image exporte sempre o valor real.
//
// Quando showResumo=true, o bloco de visualizações/preços/observações (mesmo
// conteúdo de ResumoSlidePage) é renderizado logo abaixo da tabela, na mesma
// página — usado quando o nº de programas cabe numa página só.
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
}) => {
    const [busca, setBusca] = useState('');
    const [buscaFocused, setBuscaFocused] = useState(false);
    const [editingCell, setEditingCell] = useState(null); // { rowIdx, day } | null
    const [editValue, setEditValue] = useState('');
    const [dragIndex, setDragIndex] = useState(null);

    const siglasOptions = programas
        .filter(p => p.sigla)
        .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla), 'pt-BR'));

    const filteredSiglas = siglasOptions.filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return String(p.sigla).toLowerCase().includes(q) || String(p.programa).toLowerCase().includes(q);
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const atLimit = rows.length >= maxRows;

    const rowHeight = compact ? 18 : 28;
    const rowFontSize = compact ? '0.56rem' : '0.68rem';
    const rowMinHeight = compact ? 22 : 34;

    const gridTemplate = `${LABEL_COL}px ${HORARIO_COL}px repeat(${daysInMonth}, 1fr) ${QTD_COL}px ${activeSecondsList.map(() => `${UNIT_COL}px ${TOTAL_COL}px`).join(' ')}`;

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

    const handleRowDrop = (targetIdx) => {
        if (dragIndex !== null) onReorderRows(dragIndex, targetIdx);
        setDragIndex(null);
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
            <div style={{ textAlign: 'center', marginBottom: '0.9rem', position: 'relative', flex: 'none' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--primary)' }}>
                    MÍDIA AVULSA
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
            <div style={{ flex: 'none' }}>
                {/* Week-replicate controls (só editável, some da exportação) */}
                <div className="no-export" style={{ display: 'grid', gridTemplateColumns: gridTemplate, height: '11px', marginBottom: '1px' }}>
                    <div />
                    <div />
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        const isMonday = dow === 1;
                        const hasPriorWeek = d - 7 >= 1;
                        if (!isMonday || !hasPriorWeek) return <div key={d} />;
                        return (
                            <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                    onClick={() => onReplicateWeek(d)}
                                    title="Repetir semana anterior (todos os programas)"
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: 0, color: 'var(--primary)', display: 'flex', opacity: 0.8,
                                    }}
                                >
                                    <Repeat size={9} />
                                </button>
                            </div>
                        );
                    })}
                    <div />
                    {activeSecondsList.map(sc => (
                        <React.Fragment key={sc.segundos}>
                            <div />
                            <div />
                        </React.Fragment>
                    ))}
                </div>
                {/* Day numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, fontSize: '0.5rem', fontWeight: 700, color: '#111' }}>
                    <div />
                    <div />
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                            <div key={d} style={{
                                textAlign: 'center', padding: '0.12rem 0', borderRadius: '3px',
                                backgroundColor: isWeekend ? WEEKEND_BG : 'transparent',
                            }}>
                                {d}
                            </div>
                        );
                    })}
                    <div />
                    {activeSecondsList.map(sc => (
                        <React.Fragment key={sc.segundos}>
                            <div />
                            <div />
                        </React.Fragment>
                    ))}
                </div>
                {/* Weekday letters + column headers */}
                <div style={{
                    display: 'grid', gridTemplateColumns: gridTemplate,
                    fontSize: '0.48rem', fontWeight: 600, color: '#666',
                    borderBottom: '2px solid var(--primary)', paddingBottom: '0.2rem', marginBottom: '0.1rem',
                    alignItems: 'center',
                }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#111', textTransform: 'uppercase' }}>Programa</div>
                    <div style={{ fontSize: '0.5rem', fontWeight: 800, color: '#111', textTransform: 'uppercase', textAlign: 'center' }}>Horário</div>
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                            <div key={d} style={{
                                textAlign: 'center', color: isWeekend ? '#c2570f' : '#666',
                                backgroundColor: isWeekend ? WEEKEND_BG : 'transparent',
                                borderRadius: '3px',
                            }}>
                                {WEEKDAY_LETTERS[dow]}
                            </div>
                        );
                    })}
                    <div style={{ textAlign: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#111' }}>QTD</div>
                    {activeSecondsList.map((sc, gi) => (
                        <React.Fragment key={sc.segundos}>
                            <div style={{ textAlign: 'right', fontSize: '0.44rem', fontWeight: 800, color: '#111', backgroundColor: GROUP_BG[gi % 2], padding: '0.1rem 0.15rem 0.1rem 0', borderRadius: '3px 0 0 3px' }}>
                                {sc.segundos}S UN
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.44rem', fontWeight: 800, color: '#111', backgroundColor: GROUP_BG[gi % 2], padding: '0.1rem 0.15rem', borderRadius: '0 3px 3px 0' }}>
                                {sc.segundos}S TOT
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* Program rows */}
                {rows.map((row, rowIdx) => (
                    <div
                        key={rowIdx}
                        draggable
                        onDragStart={() => setDragIndex(rowIdx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleRowDrop(rowIdx)}
                        onDragEnd={() => setDragIndex(null)}
                        style={{
                            display: 'grid', gridTemplateColumns: gridTemplate,
                            alignItems: 'center', minHeight: `${rowMinHeight}px`,
                            backgroundColor: rowIdx % 2 === 0 ? 'rgba(90,28,219,0.04)' : 'transparent',
                            opacity: dragIndex === rowIdx ? 0.4 : 1,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden' }}>
                            <GripVertical className="no-export" size={10} style={{ color: '#94a3b8', cursor: 'grab', flexShrink: 0 }} />
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
                                fontSize: rowFontSize, fontWeight: 700, color: '#333',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }} title={row.programa}>
                                {row.programa}
                            </span>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: rowFontSize, color: '#333' }}>{row.horario}</div>
                        {days.map(d => {
                            const dow = new Date(year, monthIndex, d).getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            const locked = row.allowedWeekdays && !row.allowedWeekdays.has(dow);
                            const mark = row.marks[d] || '';
                            const isEditing = editingCell && editingCell.rowIdx === rowIdx && editingCell.day === d;

                            if (locked) {
                                return (
                                    <div
                                        key={d}
                                        title="Dia fora do padrão de veiculação deste programa"
                                        style={{
                                            height: `${rowHeight}px`, margin: '1px',
                                            borderRadius: '3px', cursor: 'not-allowed',
                                            backgroundColor: 'transparent',
                                        }}
                                    />
                                );
                            }

                            if (isEditing) {
                                return (
                                    <input
                                        key={d}
                                        className="no-export"
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(normalizeMark(e.target.value))}
                                        onBlur={commitEdit}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            else if (e.key === 'Escape') cancelEdit();
                                        }}
                                        style={{
                                            height: `${rowHeight}px`, width: '100%', margin: '1px',
                                            boxSizing: 'border-box', textAlign: 'center',
                                            fontSize: rowFontSize, fontWeight: 800,
                                            border: '1.5px solid var(--primary)', borderRadius: '3px',
                                            padding: 0, fontFamily: "'Outfit', sans-serif", outline: 'none',
                                        }}
                                    />
                                );
                            }

                            return (
                                <div
                                    key={d}
                                    onClick={() => startEdit(rowIdx, d, mark)}
                                    style={{
                                        height: `${rowHeight}px`, margin: '1px',
                                        borderRadius: '3px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: rowFontSize, fontWeight: 800,
                                        color: mark ? 'white' : 'transparent',
                                        backgroundColor: mark ? 'var(--primary)' : (isWeekend ? WEEKEND_BG : UNFILLED_WEEKDAY),
                                    }}
                                >
                                    {mark}
                                </div>
                            );
                        })}
                        <div style={{ textAlign: 'center', fontSize: rowFontSize, fontWeight: 800, color: 'var(--primary)' }}>
                            {row.insercoes}
                        </div>
                        {activeSecondsList.map((sc, gi) => (
                            <React.Fragment key={sc.segundos}>
                                <div style={{ textAlign: 'right', fontSize: rowFontSize, fontWeight: 500, color: '#555', backgroundColor: GROUP_BG[gi % 2], padding: '0 0.15rem 0 0' }}>
                                    {formatMoney(row[`unitValor${sc.segundos}`], 2)}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: rowFontSize, fontWeight: 700, color: '#333', backgroundColor: GROUP_BG[gi % 2], padding: '0 0.15rem' }}>
                                    {formatMoney(row[`valor${sc.segundos}`], 2)}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                ))}

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

            {showResumo && (
                <div style={{ marginTop: '1.2rem' }}>
                    <ResumoSlide {...resumoProps} />
                </div>
            )}
        </div>
    );
};

export default MapaInsercoes;
