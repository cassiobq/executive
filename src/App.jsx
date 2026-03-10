import { useState, useEffect, useRef } from 'react';
import Home from './pages/Home';
import PatrocinioPage from './pages/PatrocinioPage';
import MidiaAvulsaPage from './pages/MidiaAvulsaPage';
import PesquisaRapidaPage from './pages/PesquisaRapidaPage';

const pageStyle = (visible) => ({
  position: 'absolute',
  inset: 0,
  transition: 'opacity 0.22s ease, transform 0.22s ease',
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateX(0)' : 'translateX(24px)',
  pointerEvents: visible ? 'auto' : 'none',
});

export default function App() {
  const [page, setPage] = useState('home');

  // Script para Pull-to-refresh customizado
  const [pullDist, setPullDist] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = 0;
      }
    };

    const handleTouchMove = (e) => {
      if (touchStartY.current === 0 || isRefreshing) return;

      const touchY = e.touches[0].clientY;
      const pullLength = touchY - touchStartY.current;

      if (pullLength > 0 && window.scrollY === 0) {
        // Applica resistencia logaritmica ao puxar
        setPullDist(Math.min(pullLength * 0.4, 80));
        // Impede o scroll nativo do browser de puxar e mostrar o fundo branco
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (pullDist > 60) {
        setIsRefreshing(true);
        setTimeout(() => window.location.reload(), 300);
      } else {
        setPullDist(0);
      }
      touchStartY.current = 0;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDist, isRefreshing]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        overflow: 'hidden',
        transform: `translateY(${pullDist}px)`,
        transition: isRefreshing || pullDist === 0 ? 'transform 0.2s ease-out' : 'none'
      }}
    >
      {/* Indicador de pull to refresh */}
      <div style={{
        position: 'absolute', top: '-50px', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px',
        opacity: pullDist / 60, transform: `scale(${Math.min(pullDist / 60, 1)})`
      }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid var(--primary)', borderTopColor: 'transparent',
          animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
        }} />
      </div>

      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
      <div style={pageStyle(page === 'home')} className="page-wrapper">
        <Home onNavigate={setPage} />
      </div>
      <div style={pageStyle(page === 'patrocinio')} className="page-wrapper">
        <PatrocinioPage onBack={() => setPage('home')} />
      </div>
      <div style={pageStyle(page === 'midia-avulsa')} className="page-wrapper">
        <MidiaAvulsaPage onBack={() => setPage('home')} />
      </div>
      <div style={pageStyle(page === 'pesquisa-rapida')} className="page-wrapper">
        <PesquisaRapidaPage onBack={() => setPage('home')} />
      </div>
    </div>
  );
}
