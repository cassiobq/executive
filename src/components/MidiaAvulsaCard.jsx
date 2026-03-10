import React from 'react';

const formatMoney = (val, decimals = 0) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const calculatePrice = (base, percent) => {
    const b = Number(base);
    const p = Number(percent);
    if (isNaN(b) || isNaN(p)) return 0;
    return b - (b * (p / 100));
};

const MidiaAvulsaCard = ({ praca, tableRows, secondsCards, numVisibleCards, totalVisualizacoes, month }) => {
    const visibleCards = secondsCards.slice(0, numVisibleCards);
    const activeSecs = visibleCards.map(sc => sc.segundos).sort((a, b) => a - b);
    const has10 = activeSecs.includes(10);
    const has15 = activeSecs.includes(15);
    const has30 = activeSecs.includes(30);
    const activeCount = activeSecs.length;

    // Dynamic widths for columns to guarantee the perfect fit based on active columns (must sum to exactly 100%)
    const valWidth = activeCount === 3 ? '16%' : activeCount === 2 ? '18%' : '24%';
    const progWidth = activeCount === 3 ? '27%' : activeCount === 2 ? '36%' : '38%';
    const diasWidth = activeCount === 3 ? '9%' : activeCount === 2 ? '10%' : '14%';
    const horWidth = activeCount === 3 ? '9%' : activeCount === 2 ? '10%' : '14%';
    const insWidth = activeCount === 3 ? '7%' : activeCount === 2 ? '8%' : '10%';

    // Totals for footer
    const totalInsercoes = tableRows.reduce((sum, r) => sum + Number(r.insercoes), 0);
    const sum10 = tableRows.reduce((sum, r) => sum + r.valor10, 0);
    const sum15 = tableRows.reduce((sum, r) => sum + r.valor15, 0);
    const sum30 = tableRows.reduce((sum, r) => sum + r.valor30, 0);

    const fontScale = numVisibleCards === 1 ? 1.8 : numVisibleCards === 2 ? 1.35 : 1;
    const showVisualizacoes = totalVisualizacoes > 0;

    const obsLines = [
        'pagamento para dia 15 do próximo mês',
        'Produção do VT deve ser cotada à parte com agência/produtora',
    ];

    return (
        <div style={{
            width: '450px',
            aspectRatio: '9 / 16',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '2.5rem 2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            color: 'var(--primary)',
            fontFamily: "'Outfit', sans-serif",
        }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                    MÍDIA AVULSA
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    PRAÇA {praca}
                </div>
                {month && (
                    <div style={{
                        position: 'absolute', top: 0, right: '-0.5rem',
                        background: 'rgba(90,28,219,0.08)', color: 'var(--primary)',
                        padding: '0.2rem 0.6rem', borderRadius: '50px',
                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '1px',
                    }}>
                        {month}
                    </div>
                )}
            </div>

            {/* Program Table */}
            {tableRows.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '2px solid var(--primary)',
                        paddingBottom: '0.3rem', marginBottom: '0.3rem',
                        fontSize: activeCount === 3 ? '0.48rem' : activeCount === 2 ? '0.52rem' : '0.58rem', fontWeight: 800,
                        color: '#111', textTransform: 'uppercase', letterSpacing: activeCount === 3 ? '0.01em' : activeCount === 2 ? '0.02em' : '0.03em',
                    }}>
                        <span style={{ flex: `0 0 ${progWidth}` }}>Programa</span>
                        <span style={{ flex: `0 0 ${diasWidth}`, textAlign: 'center' }}>Dias</span>
                        <span style={{ flex: `0 0 ${horWidth}`, textAlign: 'center' }}>Horário</span>
                        <span style={{ flex: `0 0 ${insWidth}`, textAlign: 'center' }}>Ins.</span>
                        {has10 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>Valor 10s</span>}
                        {has15 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>Valor 15s</span>}
                        {has30 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>Valor 30s</span>}
                    </div>
                    {/* Table Rows */}
                    {tableRows.map((row, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            padding: '0.25rem 0',
                            backgroundColor: i % 2 === 0 ? 'rgba(90,28,219,0.04)' : 'transparent',
                            fontSize: activeCount === 3 ? '0.50rem' : activeCount === 2 ? '0.54rem' : '0.58rem', fontWeight: 500, color: '#333',
                            alignItems: 'center',
                        }}>
                            <span style={{ flex: `0 0 ${progWidth}`, fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.programa}
                            </span>
                            <span style={{ flex: `0 0 ${diasWidth}`, textAlign: 'center', color: '#333' }}>{row.dias}</span>
                            <span style={{ flex: `0 0 ${horWidth}`, textAlign: 'center', color: '#333' }}>{row.horario}</span>
                            <span style={{ flex: `0 0 ${insWidth}`, textAlign: 'center', color: '#333' }}>{row.insercoes}</span>
                            {has10 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', fontWeight: 600, color: '#333' }}>{formatMoney(row.valor10, 2)}</span>}
                            {has15 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', fontWeight: 600, color: '#333' }}>{formatMoney(row.valor15, 2)}</span>}
                            {has30 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', fontWeight: 600, color: '#333' }}>{formatMoney(row.valor30, 2)}</span>}
                        </div>
                    ))}
                    {/* Footer Row */}
                    <div style={{
                        display: 'flex',
                        borderTop: '1px solid rgba(90,28,219,0.3)',
                        paddingTop: '0.3rem', marginTop: '0.1rem',
                        fontSize: activeCount === 3 ? '0.48rem' : activeCount === 2 ? '0.52rem' : '0.58rem', fontWeight: 800, color: 'var(--primary)',
                        alignItems: 'center',
                    }}>
                        <span style={{ flex: `0 0 ${progWidth}`, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            TOTAIS
                        </span>
                        <span style={{ flex: `0 0 ${diasWidth}` }}></span>
                        <span style={{ flex: `0 0 ${horWidth}` }}></span>
                        <span style={{ flex: `0 0 ${insWidth}`, textAlign: 'center' }}>{totalInsercoes}</span>
                        {has10 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMoney(sum10, 2)}</span>}
                        {has15 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMoney(sum15, 2)}</span>}
                        {has30 && <span style={{ flex: `0 0 ${valWidth}`, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMoney(sum30, 2)}</span>}
                    </div>
                </div>
            )}

            {/* Views Banner */}
            {showVisualizacoes && (
                <div style={{
                    backgroundColor: 'var(--success)',
                    color: 'white', textAlign: 'center',
                    padding: '0.8rem', borderRadius: '8px',
                    fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem',
                    letterSpacing: '-0.01em', boxShadow: '0 8px 20px rgba(10,199,91,0.3)',
                }}>
                    {formatMoney(totalVisualizacoes)} visualizações*
                </div>
            )}

            {/* Price Cards */}
            {visibleCards.length > 0 && (
                <div style={{
                    display: 'flex', flex: 'none',
                    gap: '0.8rem', justifyContent: 'space-between',
                    marginBottom: '1rem',
                }}>
                    {visibleCards.map((sc, i) => {
                        const discountedPrice = calculatePrice(sc.total, sc.descontoPercent || 0);
                        const [priceInt, priceCents] = formatMoney(discountedPrice, 2).split(',');
                        const [baseInt, baseCents] = formatMoney(sc.total, 2).split(',');
                        const totalChars = priceInt.length + 3; // Int + comma + 2 cents
                        const basePriceFontSize = totalChars >= 10 ? 1.05
                            : totalChars >= 9 ? 1.25
                                : totalChars >= 8 ? 1.45
                                    : totalChars >= 7 ? 1.65
                                        : 1.9;
                        const priceFontSize = `${Math.min(basePriceFontSize * fontScale, 4)}rem`;
                        const headerFontSize = `${Math.min(1.2 * fontScale, 1.62)}rem`;
                        const subFontSize = `${Math.min(1.1 * fontScale, 1.7)}rem`;
                        const labelFontSize = `${Math.min(1.2 * fontScale, 1.8)}rem`;

                        return (
                            <div key={i} style={{
                                flex: 1, height: '220px',
                                display: 'flex', flexDirection: 'column',
                                borderRadius: '8px',
                                boxShadow: '0 4px 15px rgba(90,28,219,0.2)',
                                position: 'relative',
                                backgroundColor: 'var(--primary)',
                            }}>
                                {/* Header */}
                                <div style={{
                                    backgroundColor: 'var(--secondary)', color: '#111',
                                    textAlign: 'center', padding: '0.8rem 0',
                                    fontSize: headerFontSize, fontWeight: 800,
                                    borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                                }}>
                                    {sc.segundos}s
                                </div>
                                {/* Body */}
                                <div style={{
                                    padding: '0.5rem', textAlign: 'center', color: 'white',
                                    display: 'flex', alignItems: 'center', flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: numVisibleCards === 1 ? '0.4rem' : '0.05rem',
                                    flex: 1,
                                }}>
                                    {numVisibleCards === 1 ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35em', flexWrap: 'nowrap', fontSize: subFontSize, fontWeight: 400, visibility: sc.descontoPercent > 0 ? 'visible' : 'hidden' }}>
                                                <span>de</span>
                                                <span style={{ fontWeight: 600 }}>{baseInt},{baseCents}</span>
                                                <span>por</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1em', justifyContent: 'center' }}>
                                                <div style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceInt}</div>
                                                <div style={{ fontSize: labelFontSize, fontWeight: 700 }}>,{priceCents}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ visibility: sc.descontoPercent > 0 ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem' }}>
                                                <div style={{ fontSize: `${Math.min(1 * fontScale, 1.4)}rem`, fontWeight: 400, lineHeight: 1 }}>de</div>
                                                <div style={{ fontSize: subFontSize, fontWeight: 600 }}>{baseInt},{baseCents}</div>
                                                <div style={{ fontSize: `${Math.min(1 * fontScale, 1.4)}rem`, fontWeight: 400 }}>por</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.05em', justifyContent: 'center', width: '100%' }}>
                                                <div style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceInt}</div>
                                                <div style={{ fontSize: labelFontSize, fontWeight: 700 }}>,{priceCents}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Discount Badge */}
                                {sc.descontoPercent > 0 && (
                                    <div style={{
                                        position: 'absolute', bottom: '-12px', left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: 'var(--secondary)', color: '#111',
                                        padding: '0.3rem 0.8rem', borderRadius: '50px',
                                        fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap',
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

            {/* Observations */}
            <div style={{ marginTop: '1.5rem', padding: '0 1rem' }}>
                <ul style={{
                    margin: 0, padding: 0,
                    listStylePosition: 'inside',
                    color: 'var(--primary)', fontSize: '0.65rem',
                    fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                }}>
                    {obsLines.map((line, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem', listStyleType: 'disc' }}>
                            <span dangerouslySetInnerHTML={{ __html: String(line).replace(/dia \d+ do próximo mês/g, '<b>$&</b>') }} />
                        </li>
                    ))}
                </ul>
                {showVisualizacoes && (
                    <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 400, marginTop: '0.5rem' }}>
                        * audiência estimada com base em dados de 2025
                    </div>
                )}
            </div>
        </div>
    );
};

export default MidiaAvulsaCard;
