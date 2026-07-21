import React from 'react';

const formatMoney = (val, decimals = 0) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function OportunidadesCard({ 
    oportunidadeLabel = "FELIZ CIDADE",
    incentivoLabel = "PRODUÇÃO DE VT GRÁTIS",
    praca, 
    tableRows = [], 
    secundagem, 
    descontoPercent = 60,
    totalVisualizacoes = 0, 
    month 
}) {
    
    // Calcula os totais brutos da grade gerada
    const totalInsercoes = tableRows.reduce((sum, r) => sum + Number(r.insercoes), 0);
    const totalValorTabela = tableRows.reduce((sum, r) => sum + Number(r.valorBruto || 0), 0);
    
    // Valor final com desconto aplicado
    const valorComDesconto = totalValorTabela * (1 - descontoPercent / 100);
    
    const showVisualizacoes = totalVisualizacoes > 0 && praca.toLowerCase() === 'rio verde';

    // Texto de observações de acordo com a secundagem
    const wordCount = secundagem === 15 ? 8 : 12;
    const obsLines = [
        'Pagamento para dia 15 do próximo mês.',
        `Produção inclusa: criação do VT a partir da logo e frase de até ${wordCount} palavras entregues pelo cliente.`,
        'Veiculação exclusiva de segunda a domingo nos programas sugeridos.'
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

            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', marginBottom: '1.2rem', position: 'relative' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '3px', color: '#64748B', marginBottom: '0.2rem' }}>
                    OPORTUNIDADE COMERCIAL
                </div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    {oportunidadeLabel}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 400, color: '#475569', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                    PRAÇA {praca}
                </div>
                {month && (
                    <div style={{
                        position: 'absolute', top: '-10px', right: '-0.5rem',
                        background: 'var(--primary)', color: 'white',
                        padding: '0.25rem 0.7rem', borderRadius: '50px',
                        fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '1px', boxShadow: '0 4px 10px rgba(90,28,219,0.2)'
                    }}>
                        {month}
                    </div>
                )}
            </div>

            {/* Banner de Incentivo Premium */}
            <div style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#1E1B4B',
                textAlign: 'center',
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 900,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(255,165,0,0.25)',
                marginBottom: '1.2rem',
                border: '1px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
            }}>
                <span>★</span>
                <span>INCENTIVO: {incentivoLabel}</span>
                <span>★</span>
            </div>

            {/* Tabela de Programas */}
            {tableRows.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                    {/* Cabeçalho da Tabela */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '2px solid var(--primary)',
                        paddingBottom: '0.3rem', marginBottom: '0.3rem',
                        fontSize: '0.55rem', fontWeight: 800,
                        color: '#1E1B4B', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                        <span style={{ flex: '0 0 45%' }}>Programa</span>
                        <span style={{ flex: '0 0 20%', textAlign: 'center' }}>Dias</span>
                        <span style={{ flex: '0 0 15%', textAlign: 'center' }}>Horário</span>
                        <span style={{ flex: '0 0 8%', textAlign: 'center' }}>Ins.</span>
                        <span style={{ flex: '0 0 12%', textAlign: 'right' }}>Sec.</span>
                    </div>
                    {/* Linhas da Tabela */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {tableRows.map((row, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                padding: '0.22rem 0',
                                borderBottom: '1px solid rgba(90,28,219,0.06)',
                                fontSize: '0.58rem', fontWeight: 500, color: '#334155',
                                alignItems: 'center',
                            }}>
                                <span style={{ flex: '0 0 45%', fontWeight: 800, color: '#1E1B4B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.programa}
                                </span>
                                <span style={{ flex: '0 0 20%', textAlign: 'center', color: '#475569' }}>{row.dias}</span>
                                <span style={{ flex: '0 0 15%', textAlign: 'center', color: '#475569' }}>{row.horario}</span>
                                <span style={{ flex: '0 0 8%', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{row.insercoes}</span>
                                <span style={{ flex: '0 0 12%', textAlign: 'right', fontWeight: 600 }}>{secundagem}"</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Totais do Rodapé da Tabela */}
                    <div style={{
                        display: 'flex',
                        borderTop: '2px solid var(--primary)',
                        paddingTop: '0.3rem', marginTop: '0.2rem',
                        fontSize: '0.58rem', fontWeight: 800, color: 'var(--primary)',
                        alignItems: 'center',
                    }}>
                        <span style={{ flex: '0 0 45%' }}>TOTAIS DA GRADE</span>
                        <span style={{ flex: '0 0 20%' }}></span>
                        <span style={{ flex: '0 0 15%' }}></span>
                        <span style={{ flex: '0 0 8%', textAlign: 'center' }}>{totalInsercoes}</span>
                        <span style={{ flex: '0 0 12%', textAlign: 'right' }}>{secundagem}"</span>
                    </div>
                </div>
            )}

            {/* Banner de Impactos/Visualizações (Kantar IBOPE) */}
            {showVisualizacoes && (
                <div style={{
                    backgroundColor: 'var(--success)',
                    color: 'white', textAlign: 'center',
                    padding: '0.6rem 0.5rem', borderRadius: '8px',
                    fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.2rem',
                    letterSpacing: '-0.01em', boxShadow: '0 6px 15px rgba(10,199,91,0.2)',
                    display: 'flex', flexDirection: 'column', gap: '0.1rem'
                }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                        Impactos Estimados / Mês
                    </span>
                    <span>{formatMoney(totalVisualizacoes)}</span>
                </div>
            )}

            {/* Bloco de Preços e Investimento */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(90,28,219,0.06) 0%, rgba(123,63,228,0.06) 100%)',
                border: '1px solid rgba(90,28,219,0.15)',
                borderRadius: '12px',
                padding: '0.9rem 1.2rem',
                textAlign: 'center',
                position: 'relative',
                marginBottom: '1rem'
            }}>
                {/* Badge de Desconto */}
                {descontoPercent > 0 && (
                    <div style={{
                        position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                        background: '#FFE500', color: '#1E1B4B',
                        padding: '0.15rem 0.8rem', borderRadius: '50px',
                        fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase',
                        letterSpacing: '0.5px', boxShadow: '0 3px 8px rgba(255,229,0,0.3)',
                        border: '1px solid rgba(30,27,75,0.1)'
                    }}>
                        {descontoPercent}% OFF AUTOMÁTICO
                    </div>
                )}

                {/* Preço de Tabela */}
                {descontoPercent > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textDecoration: 'line-through', marginBottom: '0.15rem' }}>
                        De R$ {formatMoney(totalValorTabela)}/mês de tabela
                    </div>
                )}

                {/* Preço Final */}
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E1B4B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Investimento Especial Feliz Cidade
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>R$</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                        {formatMoney(valorComDesconto)}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>/mês</span>
                </div>
            </div>

            {/* Rodapé e Observações */}
            <div style={{
                borderTop: '1px solid rgba(0,0,0,0.08)',
                paddingTop: '0.6rem',
                fontSize: '0.45rem',
                color: '#64748B',
                lineHeight: 1.4,
            }}>
                <div style={{ fontWeight: 800, color: '#475569', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Observações Importantes:
                </div>
                <ul style={{ margin: 0, paddingLeft: '0.85rem' }}>
                    {obsLines.map((line, i) => (
                        <li key={i} style={{ marginBottom: '0.15rem' }}>{line}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
