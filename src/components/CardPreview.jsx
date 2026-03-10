import React from 'react';

// Helper to calculate discounted price
const calculatePrice = (base, percent) => {
    const b = Number(base);
    const p = Number(percent);
    if (isNaN(b) || isNaN(p)) return 0;
    return b - (b * (p / 100));
};

const formatMoney = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const CardPreview = ({ data, cards, veiculacaoG1 }) => {
    if (!data) return null;
    const visibleCards = cards;
    const numVisibleCards = visibleCards.length;
    // Font scale grows as fewer cards are shown (they're wider so text can be larger)
    const fontScale = numVisibleCards === 1 ? 1.8 : numVisibleCards === 2 ? 1.35 : 1;

    // Logic for observations specified by user
    // Quantidade de vinhetas, secundagem escolhida
    // 12 palavras para 7 segundos, 10 palavras para 5 segundos, 4 palavras para 3 segundos.
    const rules = data.PatrocinioRules || {};
    const secs = rules.secundagemAsSeconds || 0;
    const qtd = rules.qtdVinhetas || 0;

    let palavras = 0;
    if (secs === 15) palavras = 12;
    if (secs === 10) palavras = 12;
    if (secs === 7) palavras = 12;
    if (secs === 5) palavras = 10;
    if (secs === 3) palavras = 4;

    const obsLines = [];

    // 1st Rule: <qtd> vinhetas de <sec> segundos e <palavras> palavras na TV
    if (qtd > 0) {
        let vinhetaStr = qtd === 1 ? 'vinheta' : 'vinhetas';
        obsLines.push(`${qtd} ${vinhetaStr} de ${secs} segundos e ${palavras} palavras na TV`);
    }

    // 2nd Rule: informação da vinheta de 15 segundos só aparece se a veiculação com G1/GO estiver marcada.
    if (veiculacaoG1) {
        obsLines.push('vinheta de 15 segundos no Globoplay');
    }

    // 3rd Rule: frase de pagamento mantém a mesma
    obsLines.push('pagamento para dia 15 do próximo mês');

    // 4th Rule: produção do VT — sempre presente
    obsLines.push('Produção do VT deve ser cotada à parte com agência/produtora');

    return (
        <div className="card-wrapper" style={{
            width: '450px', // Base width for preview, can scale
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
            fontFamily: "'Outfit', sans-serif"
        }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 400, letterSpacing: '2px', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                    PATROCÍNIO
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    {data.Programa}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--primary)', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                    PRAÇA {data.Praca}
                </div>
            </div>

            {/* Info Details */}
            <div style={{ color: '#111', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, marginBottom: '2rem' }}>
                <div>HORÁRIO: <span style={{ fontWeight: 400 }}>{data.Horario}</span></div>
                <div>DIAS: <span style={{ fontWeight: 400 }}>{data.Dias}</span></div>
                <div>INSERÇÕES/MÊS TV: <span style={{ fontWeight: 400 }}>{data.InsercoesTV}</span></div>
                {veiculacaoG1 && (
                    <div>DIAS DE VEICULAÇÃO DIGITAL/MÊS: <span style={{ fontWeight: 400 }}>30</span></div>
                )}
                {data.ShareRvd && (
                    <div>AUDIÊNCIA ENTRE AS TV&apos;s: <span style={{ fontWeight: 400 }}>{data.ShareRvd}%</span></div>
                )}
                {data.PerfilRvd && (
                    <div>PERFIL: <span style={{ fontWeight: 400 }}>{data.PerfilRvd}</span></div>
                )}
            </div>

            {/* Views Banner — só exibe quando há dados de audiência */}
            {data.VisualizacoesMes && data.VisualizacoesMes !== '0' && (
                <div style={{
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    boxShadow: '0 8px 20px rgba(10, 199, 91, 0.3)',
                    marginBottom: '2rem',
                    textTransform: 'lowercase'
                }}>
                    {data.VisualizacoesMes} visualizações/mês*
                </div>
            )}

            {/* Pricing Cards */}
            <div style={{
                display: 'flex',
                gap: '0.8rem',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
            }}>
                {visibleCards.map((card, i) => {
                    const discountedPrice = calculatePrice(data.PrecoBaseMensal, card.descontoPercent || 0);
                    const priceStr = formatMoney(discountedPrice);
                    const basePriceFontSize = priceStr.length >= 8 ? 1.5
                        : priceStr.length >= 7 ? 1.8
                            : priceStr.length >= 6 ? 2.1
                                : 2.5;
                    const priceFontSize = `${Math.min(basePriceFontSize * fontScale, 4)}rem`;
                    // Header capped at 2-card scale (1.62rem) so 1-card looks same as 2-card header
                    const headerFontSize = `${Math.min(1.2 * fontScale, 1.62)}rem`;
                    const subFontSize = `${Math.min(1.1 * fontScale, 1.7)}rem`;
                    const labelFontSize = `${Math.min(1.2 * fontScale, 1.8)}rem`;

                    return (
                        <div key={i} style={{
                            flex: 1,
                            height: '255px',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '8px',
                            boxShadow: '0 4px 15px rgba(90, 28, 219, 0.2)',
                            position: 'relative',
                            backgroundColor: 'var(--primary)',
                        }}>
                            {/* Card Header */}
                            <div style={{
                                backgroundColor: 'var(--secondary)',
                                color: '#111',
                                textAlign: 'center',
                                padding: '0.8rem 0',
                                fontSize: headerFontSize,
                                fontWeight: 800,
                                borderTopLeftRadius: '8px',
                                borderTopRightRadius: '8px'
                            }}>
                                {card.periodoMeses} meses
                            </div>

                            {/* Card Body */}
                            <div style={{
                                padding: '0.5rem',
                                textAlign: 'center',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: numVisibleCards === 1 ? '0.4rem' : '0.05rem',
                                flex: 1
                            }}>
                                {numVisibleCards === 1 ? (
                                    /* Single card: 2 inline lines */
                                    <>
                                        {/* Line 1: "de X/mês por" — hidden (not removed) when no discount */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35em', flexWrap: 'nowrap', fontSize: subFontSize, fontWeight: 400, visibility: card.descontoPercent > 0 ? 'visible' : 'hidden' }}>
                                            <span>de</span>
                                            <span style={{ fontWeight: 600 }}>{formatMoney(data.PrecoBaseMensal)}/mês</span>
                                            <span>por</span>
                                        </div>
                                        {/* Line 2: "BIG_PRICE /mês" */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2em', flexWrap: 'nowrap' }}>
                                            <span style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceStr}</span>
                                            <span style={{ fontSize: labelFontSize, fontWeight: 700 }}>/mês</span>
                                        </div>
                                    </>
                                ) : (
                                    /* Multi-card: stacked layout */
                                    <>
                                        {/* de/por block: hidden when no discount to keep price aligned */}
                                        <div style={{ visibility: card.descontoPercent > 0 ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem' }}>
                                            <div style={{ fontSize: `${Math.min(1 * fontScale, 1.4)}rem`, fontWeight: 400, lineHeight: 1 }}>de</div>
                                            <div style={{ fontSize: subFontSize, fontWeight: 600 }}>{formatMoney(data.PrecoBaseMensal)}/mês</div>
                                            <div style={{ fontSize: `${Math.min(1 * fontScale, 1.4)}rem`, fontWeight: 400 }}>por</div>
                                        </div>
                                        <div style={{ fontSize: priceFontSize, fontWeight: 800, lineHeight: 1 }}>{priceStr}</div>
                                        <div style={{ fontSize: labelFontSize, fontWeight: 700 }}>/mês</div>
                                    </>
                                )}
                            </div>

                            {/* Discount Badge — só aparece quando há desconto */}
                            {(card.descontoPercent > 0) && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'var(--secondary)',
                                    color: '#111',
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '50px',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                }}>
                                    {card.descontoPercent}% OFF
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Observations Footer */}
            <div style={{ marginTop: '1rem', padding: '0 1rem' }}>
                <ul style={{
                    margin: 0,
                    padding: 0,
                    listStylePosition: 'inside',
                    color: 'var(--primary)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif"
                }}>
                    {obsLines.map((line, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem', listStyleType: 'disc' }}>
                            <span dangerouslySetInnerHTML={{ __html: String(line).replace(/dia \d+ do próximo mês/g, '<b>$&</b>') }} />
                        </li>
                    ))}
                </ul>
                {data.VisualizacoesMes && data.VisualizacoesMes !== '0' && (
                    <div style={{
                        fontSize: '0.65rem',
                        color: '#666',
                        fontWeight: 400,
                        marginTop: '0.5rem'
                    }}>
                        * audiência estimada com base em dados de 2025
                    </div>
                )}
            </div>

        </div>
    );
};

export default CardPreview;
