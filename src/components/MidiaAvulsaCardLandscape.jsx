import React from 'react';
import { formatMoney, calculatePrice } from '../utils/cardHelpers';

// Slide (paisagem) — página 1: mesmo conteúdo do MidiaAvulsaCard (retrato), reorganizado em 2 colunas.
const MidiaAvulsaCardLandscape = ({ praca, tableRows, secondsCards, numVisibleCards, totalVisualizacoes, month }) => {
    const visibleCards = secondsCards.slice(0, numVisibleCards);
    const activeSecs = visibleCards.map(sc => sc.segundos).sort((a, b) => a - b);
    const has10 = activeSecs.includes(10);
    const has15 = activeSecs.includes(15);
    const has30 = activeSecs.includes(30);

    const totalInsercoes = tableRows.reduce((sum, r) => sum + Number(r.insercoes), 0);
    const sum10 = tableRows.reduce((sum, r) => sum + r.valor10, 0);
    const sum15 = tableRows.reduce((sum, r) => sum + r.valor15, 0);
    const sum30 = tableRows.reduce((sum, r) => sum + r.valor30, 0);

    const fontScale = numVisibleCards === 1 ? 1.3 : numVisibleCards === 2 ? 1.1 : 1;
    const showVisualizacoes = totalVisualizacoes > 0;

    const obsLines = [
        'pagamento para dia 15 do próximo mês',
        'Produção do VT deve ser cotada à parte com agência/produtora',
    ];

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
            <div style={{ textAlign: 'center', marginBottom: '1.2rem', position: 'relative', flex: 'none' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--primary)' }}>
                    MÍDIA AVULSA
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    PRAÇA {praca}
                </div>
                {month && (
                    <div style={{
                        position: 'absolute', top: 0, right: 0,
                        background: 'rgba(90,28,219,0.08)', color: 'var(--primary)',
                        padding: '0.2rem 0.6rem', borderRadius: '50px',
                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '1px',
                    }}>
                        {month}
                    </div>
                )}
            </div>

            {/* Body: 2 columns */}
            <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
                {/* Left: program table */}
                <div style={{ flex: '1.4', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {tableRows.length > 0 && (
                        <div>
                            <div style={{
                                display: 'flex', borderBottom: '2px solid var(--primary)',
                                paddingBottom: '0.4rem', marginBottom: '0.4rem',
                                fontSize: '0.62rem', fontWeight: 800, color: '#111',
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                            }}>
                                <span style={{ flex: '0 0 40%' }}>Programa</span>
                                <span style={{ flex: '0 0 14%', textAlign: 'center' }}>Dias</span>
                                <span style={{ flex: '0 0 14%', textAlign: 'center' }}>Horário</span>
                                <span style={{ flex: '0 0 10%', textAlign: 'center' }}>Ins.</span>
                                {has10 && <span style={{ flex: 1, textAlign: 'right' }}>10s</span>}
                                {has15 && <span style={{ flex: 1, textAlign: 'right' }}>15s</span>}
                                {has30 && <span style={{ flex: 1, textAlign: 'right' }}>30s</span>}
                            </div>
                            {tableRows.map((row, i) => (
                                <div key={i} style={{
                                    display: 'flex', padding: '0.3rem 0',
                                    backgroundColor: i % 2 === 0 ? 'rgba(90,28,219,0.04)' : 'transparent',
                                    fontSize: '0.66rem', fontWeight: 500, color: '#333', alignItems: 'center',
                                }}>
                                    <span style={{ flex: '0 0 40%', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.programa}
                                    </span>
                                    <span style={{ flex: '0 0 14%', textAlign: 'center' }}>{row.dias}</span>
                                    <span style={{ flex: '0 0 14%', textAlign: 'center' }}>{row.horario}</span>
                                    <span style={{ flex: '0 0 10%', textAlign: 'center' }}>{row.insercoes}</span>
                                    {has10 && <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.valor10, 2)}</span>}
                                    {has15 && <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.valor15, 2)}</span>}
                                    {has30 && <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.valor30, 2)}</span>}
                                </div>
                            ))}
                            <div style={{
                                display: 'flex', borderTop: '1px solid rgba(90,28,219,0.3)',
                                paddingTop: '0.4rem', marginTop: '0.2rem',
                                fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary)', alignItems: 'center',
                            }}>
                                <span style={{ flex: '0 0 40%' }}>TOTAIS</span>
                                <span style={{ flex: '0 0 14%' }}></span>
                                <span style={{ flex: '0 0 14%' }}></span>
                                <span style={{ flex: '0 0 10%', textAlign: 'center' }}>{totalInsercoes}</span>
                                {has10 && <span style={{ flex: 1, textAlign: 'right' }}>{formatMoney(sum10, 2)}</span>}
                                {has15 && <span style={{ flex: 1, textAlign: 'right' }}>{formatMoney(sum15, 2)}</span>}
                                {has30 && <span style={{ flex: 1, textAlign: 'right' }}>{formatMoney(sum30, 2)}</span>}
                            </div>
                        </div>
                    )}

                    {/* Observations */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <ul style={{
                            margin: 0, padding: 0, listStylePosition: 'inside',
                            color: 'var(--primary)', fontSize: '0.62rem', fontWeight: 600,
                        }}>
                            {obsLines.map((line, idx) => (
                                <li key={idx} style={{ marginBottom: '0.2rem', listStyleType: 'disc' }}>
                                    <span dangerouslySetInnerHTML={{ __html: String(line).replace(/dia \d+ do próximo mês/g, '<b>$&</b>') }} />
                                </li>
                            ))}
                        </ul>
                        {showVisualizacoes && (
                            <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.4rem' }}>
                                * audiência estimada com base em dados de 2025
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: views banner + price cards */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center', gap: '1rem' }}>
                    {showVisualizacoes && (
                        <div style={{
                            backgroundColor: 'var(--success)', color: 'white', textAlign: 'center',
                            padding: '0.8rem', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 800,
                            boxShadow: '0 8px 20px rgba(10,199,91,0.3)',
                        }}>
                            {formatMoney(totalVisualizacoes)} visualizações*
                        </div>
                    )}

                    {visibleCards.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: numVisibleCards >= 2 ? 'row' : 'column', gap: '0.8rem' }}>
                            {visibleCards.map((sc, i) => {
                                const discountedPrice = calculatePrice(sc.total, sc.descontoPercent || 0);
                                const [priceInt, priceCents] = formatMoney(discountedPrice, 2).split(',');
                                const [baseInt, baseCents] = formatMoney(sc.total, 2).split(',');
                                const totalChars = priceInt.length + 3;
                                const basePriceFontSize = totalChars >= 10 ? 0.9
                                    : totalChars >= 9 ? 1.05
                                        : totalChars >= 8 ? 1.2
                                            : totalChars >= 7 ? 1.4
                                                : 1.6;
                                const priceFontSize = `${Math.min(basePriceFontSize * fontScale, 2.4)}rem`;

                                return (
                                    <div key={i} style={{
                                        flex: 1, minHeight: '150px',
                                        display: 'flex', flexDirection: 'column',
                                        borderRadius: '8px', boxShadow: '0 4px 15px rgba(90,28,219,0.2)',
                                        position: 'relative', backgroundColor: 'var(--primary)',
                                    }}>
                                        <div style={{
                                            backgroundColor: 'var(--secondary)', color: '#111',
                                            textAlign: 'center', padding: '0.5rem 0', fontSize: '0.9rem', fontWeight: 800,
                                            borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                                        }}>
                                            {sc.segundos}s
                                        </div>
                                        <div style={{
                                            padding: '0.5rem', textAlign: 'center', color: 'white',
                                            display: 'flex', alignItems: 'center', flexDirection: 'column',
                                            justifyContent: 'center', gap: '0.15rem', flex: 1,
                                        }}>
                                            <div style={{ visibility: sc.descontoPercent > 0 ? 'visible' : 'hidden', display: 'flex', alignItems: 'baseline', gap: '0.3em', fontSize: '0.75rem', fontWeight: 400 }}>
                                                <span>de</span>
                                                <span style={{ fontWeight: 600 }}>{baseInt},{baseCents}</span>
                                                <span>por</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1em' }}>
                                                <div style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceInt}</div>
                                                <div style={{ fontSize: `${Math.min(1 * fontScale, 1.2)}rem`, fontWeight: 700 }}>,{priceCents}</div>
                                            </div>
                                        </div>
                                        {sc.descontoPercent > 0 && (
                                            <div style={{
                                                position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
                                                backgroundColor: 'var(--secondary)', color: '#111',
                                                padding: '0.25rem 0.7rem', borderRadius: '50px',
                                                fontWeight: 800, fontSize: '0.75rem', whiteSpace: 'nowrap',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                            }}>
                                                {sc.descontoPercent}% OFF
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MidiaAvulsaCardLandscape;
