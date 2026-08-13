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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
