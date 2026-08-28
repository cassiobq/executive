import React from 'react';
import { formatMoney, calculatePrice } from '../utils/cardHelpers';

// Conteúdo compartilhado entre o modo "página única" (embutido depois da tabela)
// e a página 2 standalone (quando o nº de programas estoura o limite de 1 página).
const ResumoSlide = ({ totalVisualizacoes, secondsCards, numVisibleCards }) => {
    const visibleCards = secondsCards.slice(0, numVisibleCards);
    const showVisualizacoes = totalVisualizacoes > 0;
    const fontScale = numVisibleCards === 1 ? 1.3 : numVisibleCards === 2 ? 1.15 : 1;

    const obsLines = [
        'pagamento para dia 15 do próximo mês',
        'Produção do VT deve ser cotada à parte com agência/produtora',
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {showVisualizacoes && (
                <div style={{
                    backgroundColor: 'var(--success)', color: 'white', textAlign: 'center',
                    padding: '0.7rem', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 800,
                    boxShadow: '0 8px 20px rgba(10,199,91,0.3)',
                }}>
                    {formatMoney(totalVisualizacoes)} visualizações*
                </div>
            )}

            {visibleCards.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {visibleCards.map((sc, i) => {
                        const discountedPrice = calculatePrice(sc.total, sc.descontoPercent || 0);
                        const [priceInt, priceCents] = formatMoney(discountedPrice, 2).split(',');
                        const [baseInt, baseCents] = formatMoney(sc.total, 2).split(',');
                        const totalChars = priceInt.length + 3;
                        const basePriceFontSize = totalChars >= 10 ? 1.0
                            : totalChars >= 9 ? 1.15
                                : totalChars >= 8 ? 1.35
                                    : totalChars >= 7 ? 1.55
                                        : 1.8;
                        const priceFontSize = `${Math.min(basePriceFontSize * fontScale, 2.6)}rem`;

                        return (
                            <div key={i} style={{
                                flex: 1, minHeight: '150px',
                                display: 'flex', flexDirection: 'column',
                                borderRadius: '8px', boxShadow: '0 4px 15px rgba(90,28,219,0.2)',
                                position: 'relative', backgroundColor: 'var(--primary)',
                            }}>
                                <div style={{
                                    backgroundColor: 'var(--secondary)', color: '#111',
                                    textAlign: 'center', padding: '0.55rem 0', fontSize: '0.95rem', fontWeight: 800,
                                    borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                                }}>
                                    {sc.segundos}s
                                </div>
                                <div style={{
                                    padding: '0.5rem', textAlign: 'center', color: 'white',
                                    display: 'flex', alignItems: 'center', flexDirection: 'column',
                                    justifyContent: 'center', gap: '0.2rem', flex: 1,
                                }}>
                                    <div style={{ visibility: sc.descontoPercent > 0 ? 'visible' : 'hidden', display: 'flex', alignItems: 'baseline', gap: '0.3em', fontSize: '0.8rem', fontWeight: 400 }}>
                                        <span>de</span>
                                        <span style={{ fontWeight: 600 }}>{baseInt},{baseCents}</span>
                                        <span>por</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1em' }}>
                                        <div style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceInt}</div>
                                        <div style={{ fontSize: `${Math.min(1.1 * fontScale, 1.3)}rem`, fontWeight: 700 }}>,{priceCents}</div>
                                    </div>
                                </div>
                                {sc.descontoPercent > 0 && (
                                    <div style={{
                                        position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
                                        backgroundColor: 'var(--secondary)', color: '#111',
                                        padding: '0.25rem 0.7rem', borderRadius: '50px',
                                        fontWeight: 800, fontSize: '0.78rem', whiteSpace: 'nowrap',
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

            <div>
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
                    <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.3rem' }}>
                        * audiência estimada com base em dados de 2025
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumoSlide;
