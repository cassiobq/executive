import { useState, useRef, useEffect } from 'react';
import { Download, Settings2, X, Copy, Check } from 'lucide-react';
import { fetchAllSheetData } from './services/sheetsService';
import CardPreview from './components/CardPreview';

// Helper to format currency
const formatMoney = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Helper to parse numbers safely from strings formatted as money or with commas
const parseNum = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = val.toString().replace(/[^0-9,-]+/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

function App() {
  const [loading, setLoading] = useState(true);

  // Database State
  const [db, setDb] = useState({ programas: [], valores: [], patrocinios: [] });

  // Form State
  const [selectedPrograma, setSelectedPrograma] = useState('');
  const [selectedPraca, setSelectedPraca] = useState('');
  const [selectedPatrocinio, setSelectedPatrocinio] = useState('');
  const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [veiculacaoG1, setVeiculacaoG1] = useState(true);

  const [cards, setCards] = useState([
    { periodoMeses: 2, descontoPercent: 10 },
    { periodoMeses: 6, descontoPercent: 20 },
    { periodoMeses: 12, descontoPercent: 35 },
  ]);

  const cardRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchAllSheetData().then(res => {
      setDb(res);
      if (res.programas && res.programas.length > 0) {
        const firstProg = res.programas[0].programa;
        setSelectedPrograma(firstProg);

        const pValores = res.valores.filter(v => v.programa === firstProg);
        if (pValores.length > 0) setSelectedPraca(pValores[0].praca);

        const pPatrocinios = res.patrocinios.filter(p => p.programa === firstProg);
        if (pPatrocinios.length > 0) setSelectedPatrocinio(pPatrocinios[0].secundagem);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // Whenever selectedPatrocinio changes, check if it has Digital option
    const curP = db.patrocinios.find(p => String(p.programa) === String(selectedPrograma) && String(p.secundagem) === String(selectedPatrocinio)) || {};
    const digAux = curP.coeficiente_dig;
    const hasDig = digAux !== undefined && digAux !== null && String(digAux) !== '' && parseNum(digAux) > 0;

    if (!hasDig) {
      setVeiculacaoG1(false);
    }
  }, [selectedPrograma, selectedPatrocinio, db.patrocinios]);

  // Update Praça and Patrocinio when Programa changes
  useEffect(() => {
    if (selectedPrograma && db.programas.length > 0) {
      const pValores = db.valores.filter(v => v.programa === selectedPrograma);
      if (pValores.length > 0 && !pValores.map(v => v.praca).includes(selectedPraca)) {
        setSelectedPraca(pValores[0].praca);
      }

      const pPatrocinios = db.patrocinios.filter(p => p.programa === selectedPrograma);
      if (pPatrocinios.length > 0 && !pPatrocinios.map(p => p.secundagem).includes(selectedPatrocinio)) {
        setSelectedPatrocinio(pPatrocinios[0].secundagem);
      }
    }
  }, [selectedPrograma, db]);

  const updateCard = (index, field, value) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleCopyImage = async () => {
    if (cardRef.current) {
      const htmlToImage = await import('html-to-image');
      try {
        const blob = await htmlToImage.toBlob(cardRef.current, { quality: 1, pixelRatio: 3 });
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar imagem:', err);
        alert('Um erro ocorreu ao copiar a imagem. Tente novamente.');
      }
    }
  };

  const handleConfirmEdit = () => {
    setIsMobileTrayOpen(false);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando dados das tabelas...</div>;

  // --- CALCULATIONS BASED ON SELECTED ITEMS --- //

  const curProg = db.programas.find(p => String(p.programa) === String(selectedPrograma)) || {};
  const curValor = db.valores.find(v => String(v.programa) === String(selectedPrograma) && String(v.praca) === String(selectedPraca)) || {};
  const curPat = db.patrocinios.find(p => String(p.programa) === String(selectedPrograma) && String(p.secundagem) === String(selectedPatrocinio)) || {};

  // 1. Inserções/mês TV = coluna insercoes_mes da sheet programas
  const insercoesTvProg = parseNum(curProg.insercoes_mes);

  // 2. Visualizações/mês = (programa.audiencia * programa.insercoes_mes) * patrocinios.qtd_vinhetas
  const audiencia = parseNum(curProg.audiencia);
  const qtdVinhetas = parseNum(curPat.qtd_vinhetas);
  const visualizacoesMesCalc = (audiencia * insercoesTvProg) * qtdVinhetas;

  // 3. Valores dos cards = (valores.valor_base) * (Coeficiente) * (patrocinios.qtd_vinhetas) * (patrocinios.insercoes_mes)
  // If patrocinios.insercoes_mes doesn't exist, we fallback to programas.insercoes_mes just in case.
  const valorBase = parseNum(curValor.valor_base);

  // New Columns: coeficiente_tv and coeficiente_dig
  const coeficienteTv = parseNum(curPat.coeficiente_tv);
  const coeficienteDigRaw = curPat.coeficiente_dig;
  const coeficienteDig = parseNum(coeficienteDigRaw);
  const temDigital = coeficienteDigRaw !== undefined && coeficienteDigRaw !== '' && coeficienteDig > 0;

  const insercoesTvPat = parseNum(curPat.insercoes_mes) || parseNum(curProg.insercoes_mes);

  // Calcula Preço TV
  const precoTv = valorBase * coeficienteTv * qtdVinhetas * insercoesTvPat;

  // Calcula Preço Digital = precoTv * coeficiente_dig
  // Exemplo: precoTv=2370, coef_dig=0.1 → precoDig=237 → total=2607
  let precoDig = 0;
  if (temDigital && veiculacaoG1) {
    precoDig = precoTv * coeficienteDig;
  }

  const precoBaseCalculado = precoTv + precoDig;

  // For observations raw logic (Identify seconds from the label if possible)
  // E.g. "5 SEGUNDOS JORNALISMO" -> returns 5
  const extractSecs = (str) => {
    if (!str) return 0;
    const s = String(str);
    const match = s.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Prepare data for CardPreview
  const previewData = {
    Programa: curProg.programa || 'Selecione',
    Praca: curValor.praca || 'Selecione',
    Horario: curProg.horario || curProg.horário || '--:--',
    Dias: curProg.dias || '---',
    InsercoesTV: insercoesTvProg,
    VisualizacoesMes: formatMoney(visualizacoesMesCalc),
    PrecoBaseMensal: precoBaseCalculado,
    // For observations logic
    PatrocinioRules: {
      qtdVinhetas,
      secundagemAsSeconds: extractSecs(curPat.secundagem)
    }
  };

  // Derived arrays for dropdowns
  const programasOptions = db.programas.map(p => p.programa).filter(Boolean);
  const pracasOptions = db.valores.filter(v => v.programa === selectedPrograma).map(v => v.praca).filter(Boolean);
  const patrociniosOptions = db.patrocinios.filter(p => p.programa === selectedPrograma).map(p => p.secundagem).filter(Boolean);

  return (
    <div className="app-container">
      {/* Mobile Overlay Background */}
      {isMobileTrayOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileTrayOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileTrayOpen ? 'open' : ''}`}>
        <div className="sidebar-header-mobile">
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Configurar Card</h2>
          <button className="close-tray-btn" onClick={handleConfirmEdit} title="Confirmar e atualizar">
            <Check size={24} color="#111" />
          </button>
        </div>

        <div className="form-group">
          <label>Programa</label>
          <select
            className="form-control"
            value={selectedPrograma}
            onChange={(e) => {
              const newProg = e.target.value;
              setSelectedPrograma(newProg);
              // Reset Praça and Secundagem immediately to first valid option
              const newPracas = db.valores.filter(v => v.programa === newProg);
              if (newPracas.length > 0) setSelectedPraca(newPracas[0].praca);
              const newPats = db.patrocinios.filter(p => p.programa === newProg);
              if (newPats.length > 0) setSelectedPatrocinio(newPats[0].secundagem);
            }}
          >
            {programasOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Praça</label>
          <select
            className="form-control"
            value={selectedPraca}
            onChange={(e) => setSelectedPraca(e.target.value)}
          >
            {pracasOptions.length === 0 && <option value="">Sem praças</option>}
            {pracasOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Secundagem</label>
          <select
            className="form-control"
            value={selectedPatrocinio}
            onChange={(e) => setSelectedPatrocinio(e.target.value)}
          >
            {patrociniosOptions.length === 0 && <option value="">Sem secundagens</option>}
            {patrociniosOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Preços e Descontos</h3>

        {cards.map((card, idx) => (
          <div key={idx} className="card-settings">
            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Card {idx + 1}</h4>
            <div className="card-settings-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Período (Meses)</label>
                <input
                  type="number"
                  min="1" max="12"
                  className="form-control"
                  value={card.periodoMeses === '' ? '' : card.periodoMeses}
                  onChange={(e) => updateCard(idx, 'periodoMeses', e.target.value === '' ? '' : parseInt(e.target.value || '0', 10))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Desconto (%)</label>
                <input
                  type="number"
                  min="0" max="100"
                  className="form-control"
                  value={card.descontoPercent === '' ? '' : card.descontoPercent}
                  onChange={(e) => updateCard(idx, 'descontoPercent', e.target.value === '' ? '' : parseInt(e.target.value || '0', 10))}
                />
              </div>
            </div>
          </div>
        ))}

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Observações Extras</h3>

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="g1"
            checked={veiculacaoG1}
            disabled={!temDigital}
            onChange={(e) => setVeiculacaoG1(e.target.checked)}
          />
          <label htmlFor="g1" style={{ opacity: temDigital ? 1 : 0.5 }}>
            Incluir linha de Veiculação G1 GO (30 dias)
            {!temDigital && " (Indisponível)"}
          </label>
        </div>

        {/* Exibe alguns dados de debug para ajudar a ver se as tabelas vieram certas */}
        <div style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#888', background: '#f0f0f0', padding: '1rem', borderRadius: '4px' }}>
          <strong>Debug INFO:</strong><br />
          Audiência: {audiencia}<br />
          Inserções (Prog): {insercoesTvProg}<br />
          Inserções (Patrocinio): {insercoesTvPat}<br />
          Qtd Vinhetas: {qtdVinhetas}<br />
          Valor Base: {valorBase}<br />
          Coeficiente TV: {coeficienteTv}<br />
          Coeficiente DIG: {temDigital ? coeficienteDig : 'N/A'}<br />
          Total Final Renderizado: {precoBaseCalculado}
        </div>

      </aside>

      <main className="main-content">
        <div className="preview-scale-wrapper">
          <div ref={cardRef}>
            <CardPreview
              data={previewData}
              cards={cards}
              veiculacaoG1={veiculacaoG1}
              secundagem={selectedPatrocinio}
            />
          </div>
        </div>

        <div className="action-buttons-wrapper">
          <button
            className="btn-primary"
            onClick={handleCopyImage}
            style={{ backgroundColor: isCopied ? '#0ac75b' : 'var(--primary)', width: '100%', maxWidth: '300px' }}
          >
            {isCopied ? (
              <><Check size={20} /> Copiado para colar!</>
            ) : (
              <><Copy size={20} /> Copiar Imagem</>
            )}
          </button>
        </div>

        {/* Floating Actions for Mobile */}
        <div className="mobile-floating-actions">
          <button className="mobile-tray-toggle" onClick={() => setIsMobileTrayOpen(true)}>
            <Settings2 size={24} /> Editar
          </button>

          <button
            className="mobile-copy-btn"
            onClick={handleCopyImage}
            style={{ backgroundColor: isCopied ? '#0ac75b' : '' }}
          >
            {isCopied ? (
              <><Check size={20} /> Copiado!</>
            ) : (
              <><Copy size={20} /> Copiar Imagem</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
