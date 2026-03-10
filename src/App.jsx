import { useState } from 'react';
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

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
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
