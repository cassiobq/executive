import React from 'react';
import ResumoSlide from './ResumoSlide';

// Página 2 standalone — só existe quando o nº de programas do mapa estoura o
// limite de página única (ver MidiaAvulsaPage: THRESHOLD_UMA_PAGINA).
const ResumoSlidePage = ({ pracaLabel, monthLabel, year, totalVisualizacoes, secondsCards, numVisibleCards }) => {
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
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative', flex: 'none' }}>
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

            <ResumoSlide
                totalVisualizacoes={totalVisualizacoes}
                secondsCards={secondsCards}
                numVisibleCards={numVisibleCards}
            />
        </div>
    );
};

export default ResumoSlidePage;
