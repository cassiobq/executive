import { useState, useRef, useEffect } from 'react';
import { Settings2, Check, Camera, ArrowLeft, Home } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import CardPreview from '../components/CardPreview';

// Helper to format currency
const formatMoney = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Helper to parse numbers safely
const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9,-]+/g, "").replace(",", ".");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const PRACAS = [
    { key: 'goiania', label: 'GOIÂNIA' },
    { key: 'anapolis', label: 'ANÁPOLIS' },
    { key: 'rio_verde', label: 'RIO VERDE' },
    { key: 'luziania', label: 'LUZIÂNIA' },
    { key: 'itumbiara', label: 'ITUMBIARA' },
    { key: 'catalao', label: 'CATALÃO' },
    { key: 'porangatu', label: 'PORANGATU' },
    { key: 'jatai', label: 'JATAÍ' },
];

// Toggle switch component
const Toggle = ({ checked, onChange }) => (
    <div
        onClick={onChange}
        style={{
            width: '40px', height: '22px', borderRadius: '11px',
            background: checked ? 'var(--primary)' : '#cbd5e1',
            cursor: 'pointer', position: 'relative',
            transition: 'background 0.2s', flexShrink: 0,
        }}
    >
        <div style={{
            position: 'absolute', top: '3px',
            left: checked ? '21px' : '3px',
            width: '16px', height: '16px',
            background: 'white', borderRadius: '50%',
            transition: 'left 0.18s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
    </div>
);

export default function PatrocinioPage({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState({ programas: [], patrocinios: [] });
    const [selectedPrograma, setSelectedPrograma] = useState('');
    const [selectedPraca, setSelectedPraca] = useState('');
    const [selectedPatrocinio, setSelectedPatrocinio] = useState('');
    const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [veiculacaoG1, setVeiculacaoG1] = useState(true);
    const [cards, setCards] = useState([
        { active: true, periodoMeses: 2, descontoPercent: 10 },
        { active: true, periodoMeses: 6, descontoPercent: 20 },
        { active: true, periodoMeses: 12, descontoPercent: 35 },
    ]);

    const cardRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        fetchAllSheetData().then(res => {
            setDb(res);
            if (res.patrocinios && res.patrocinios.length > 0) {
                const firstProg = res.patrocinios[0].programa;
                setSelectedPrograma(firstProg);
                const progData = res.programas.find(p => String(p.programa).trim() === String(firstProg).trim()) || {};
                const rioVerde = PRACAS.find(pr => pr.key === 'rio_verde');
                const hasRioVerde = rioVerde && progData['rio_verde'] !== null && progData['rio_verde'] !== undefined && String(progData['rio_verde']).trim() !== '';
                const firstPraca = hasRioVerde
                    ? rioVerde
                    : PRACAS.find(pr => progData[pr.key] !== null && progData[pr.key] !== undefined && String(progData[pr.key]).trim() !== '');
                if (firstPraca) setSelectedPraca(firstPraca.key);
                setSelectedPatrocinio(res.patrocinios[0].secundagem);
            }
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const curP = db.patrocinios.find(p => String(p.programa) === String(selectedPrograma) && String(p.secundagem) === String(selectedPatrocinio)) || {};
        const digAux = curP.coeficiente_dig;
        const hasDig = digAux !== undefined && digAux !== null && String(digAux) !== '' && parseNum(digAux) > 0;
        if (!hasDig) setVeiculacaoG1(false);
    }, [selectedPrograma, selectedPatrocinio, db.patrocinios]);

    useEffect(() => {
        if (selectedPrograma && db.programas.length > 0) {
            const progData = db.programas.find(p => String(p.programa).trim() === String(selectedPrograma).trim()) || {};
            const currentPracaValid = progData[selectedPraca] !== null && progData[selectedPraca] !== undefined && String(progData[selectedPraca]).trim() !== '';
            if (!currentPracaValid) {
                const validPracas = PRACAS.filter(pr => progData[pr.key] !== null && progData[pr.key] !== undefined && String(progData[pr.key]).trim() !== '');
                if (validPracas.length > 0) setSelectedPraca(validPracas[0].key);
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
        if (!cardRef.current) return;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 400);
        const htmlToImage = await import('html-to-image');
        try {
            const blob = await htmlToImage.toBlob(cardRef.current, { quality: 1, pixelRatio: 3 });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            try {
                const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
                const link = document.createElement('a');
                link.download = 'card-executive.png';
                link.href = dataUrl;
                link.click();
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch {
                alert('Erro ao salvar imagem. Tente novamente.');
            }
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#5A1CDB', fontSize: '1rem', fontWeight: 600 }}>
            Carregando dados...
        </div>
    );

    // --- CALCULATIONS ---
    const curProg = db.programas.find(p => String(p.programa).trim() === String(selectedPrograma).trim()) || {};
    const curPat = db.patrocinios.find(p => String(p.programa) === String(selectedPrograma) && String(p.secundagem) === String(selectedPatrocinio)) || {};

    const insercoesTvProg = parseNum(curProg.insercoes_mes);
    const audiencia = parseNum(curProg.audiencia_rvd);
    const qtdVinhetas = parseNum(curPat.qtd_vinhetas);
    const visualizacoesMesCalc = audiencia * insercoesTvProg * qtdVinhetas;
    const valorBase = parseNum(curProg[selectedPraca]);
    const coeficienteTv = parseNum(curPat.coeficiente_tv);
    const coeficienteDigRaw = curPat.coeficiente_dig;
    const coeficienteDig = parseNum(coeficienteDigRaw);
    const temDigital = coeficienteDigRaw !== undefined && coeficienteDigRaw !== '' && coeficienteDig > 0;
    const precoTv = valorBase * coeficienteTv * qtdVinhetas * insercoesTvProg;
    let precoDig = 0;
    if (temDigital && veiculacaoG1) precoDig = precoTv * coeficienteDig;
    const precoBaseCalculado = precoTv + precoDig;

    const extractSecs = (str) => {
        if (!str) return 0;
        const match = String(str).match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    };

    const pracaLabel = PRACAS.find(pr => pr.key === selectedPraca)?.label || selectedPraca;
    const isRioVerde = selectedPraca === 'rio_verde';
    const showVisualizacoes = isRioVerde && audiencia > 0;
    const shareRvd = isRioVerde && curProg.share_rvd ? String(curProg.share_rvd).trim() : null;
    const perfilRvd = isRioVerde && (curProg.sexo_rvd || curProg.classe_rvd || curProg.idade_rvd)
        ? [curProg.sexo_rvd, curProg.classe_rvd, curProg.idade_rvd].filter(Boolean).join(', ')
        : null;

    const previewData = {
        Programa: curProg.programa || 'Selecione',
        Praca: pracaLabel,
        Horario: curProg.horario || '--:--',
        Dias: curProg.dias || '---',
        InsercoesTV: qtdVinhetas * insercoesTvProg,
        VisualizacoesMes: showVisualizacoes ? formatMoney(visualizacoesMesCalc) : null,
        ShareRvd: shareRvd,
        PerfilRvd: perfilRvd,
        PrecoBaseMensal: precoBaseCalculado,
        PatrocinioRules: { qtdVinhetas, secundagemAsSeconds: extractSecs(curPat.secundagem) }
    };

    const programasOptions = [...new Set(db.patrocinios.map(p => p.programa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const pracasOptions = PRACAS
        .filter(pr => curProg[pr.key] !== null && curProg[pr.key] !== undefined && String(curProg[pr.key]).trim() !== '')
        .sort((a, b) => {
            if (a.key === 'rio_verde') return -1;
            if (b.key === 'rio_verde') return 1;
            return a.label.localeCompare(b.label, 'pt-BR');
        });
    const patrociniosOptions = db.patrocinios.filter(p => p.programa === selectedPrograma).map(p => p.secundagem).filter(Boolean);

    return (
        <div className="app-container">
            {isMobileTrayOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileTrayOpen(false)} />
            )}

            <aside className={`sidebar ${isMobileTrayOpen ? 'open' : ''}`}>
                <div className="sidebar-header-mobile">
                    <h2 style={{ marginTop: 0, marginBottom: 0 }}>Configurar Card</h2>
                    <button className="close-tray-btn" onClick={() => setIsMobileTrayOpen(false)} title="Confirmar">
                        <Check size={24} color="#111" />
                    </button>
                </div>

                {/* Back to home — desktop only */}
                <button
                    onClick={onBack}
                    className="desktop-only"
                    style={{
                        alignItems: 'center', gap: '0.4rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#5A1CDB', fontWeight: 700, fontSize: '0.85rem',
                        padding: '0 0 1rem', fontFamily: "'Outfit', sans-serif",
                    }}
                >
                    <ArrowLeft size={16} /> Início
                </button>

                <div className="form-group">
                    <label>Programa</label>
                    <select
                        className="form-control"
                        value={selectedPrograma}
                        onChange={(e) => {
                            const newProg = e.target.value;
                            setSelectedPrograma(newProg);
                            const progData = db.programas.find(p => String(p.programa).trim() === String(newProg).trim()) || {};
                            const currentPracaValid = progData[selectedPraca] !== null && progData[selectedPraca] !== undefined && String(progData[selectedPraca]).trim() !== '';
                            if (!currentPracaValid) {
                                const hasRioVerde = progData['rio_verde'] !== null && progData['rio_verde'] !== undefined && String(progData['rio_verde']).trim() !== '';
                                const fallback = hasRioVerde
                                    ? 'rio_verde'
                                    : (PRACAS.find(pr => progData[pr.key] !== null && progData[pr.key] !== undefined && String(progData[pr.key]).trim() !== '')?.key);
                                if (fallback) setSelectedPraca(fallback);
                            }
                            const newPats = db.patrocinios.filter(p => p.programa === newProg);
                            if (newPats.length > 0) setSelectedPatrocinio(newPats[0].secundagem);
                        }}
                    >
                        {programasOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Praça</label>
                    <select className="form-control" value={selectedPraca} onChange={(e) => setSelectedPraca(e.target.value)}>
                        {pracasOptions.length === 0 && <option value="">Sem praças</option>}
                        {pracasOptions.map(pr => <option key={pr.key} value={pr.key}>{pr.label}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Secundagem</label>
                    <select className="form-control" value={selectedPatrocinio} onChange={(e) => setSelectedPatrocinio(e.target.value)}>
                        {patrociniosOptions.length === 0 && <option value="">Sem secundagens</option>}
                        {patrociniosOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Preços e Descontos</h3>

                {cards.map((card, idx) => {
                    const isActive = card.active;
                    return (
                        <div key={idx} style={{
                            background: isActive ? '#f8f5ff' : '#f8f8f8',
                            border: `1.5px solid ${isActive ? 'var(--primary)' : '#e2e8f0'}`,
                            borderRadius: '10px', padding: '0.7rem 0.9rem',
                            marginBottom: '0.6rem', transition: 'border-color 0.15s',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isActive ? '0.6rem' : 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Toggle checked={isActive} onChange={() => {
                                        const activeCount = cards.filter(c => c.active).length;
                                        if (isActive && activeCount <= 1) return; // Prevent disabling last card
                                        updateCard(idx, 'active', !isActive);
                                    }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? 'var(--primary)' : '#94a3b8' }}>
                                        Card {idx + 1}
                                    </span>
                                </div>
                            </div>

                            {isActive && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Período (Meses)</label>
                                        <input
                                            type="number" min="1" max="12"
                                            style={{
                                                width: '100%', padding: '0.35rem 0.5rem',
                                                border: '1.5px solid #e2e8f0', borderRadius: '8px',
                                                fontSize: '0.9rem', fontFamily: "'Outfit', sans-serif",
                                                outline: 'none', boxSizing: 'border-box', background: 'white',
                                            }}
                                            value={card.periodoMeses === '' ? '' : card.periodoMeses}
                                            onChange={(e) => updateCard(idx, 'periodoMeses', e.target.value === '' ? '' : parseInt(e.target.value || '0', 10))}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Desconto (%)</label>
                                        <input
                                            type="number" min="0" max="100"
                                            style={{
                                                width: '100%', padding: '0.35rem 0.5rem',
                                                border: '1.5px solid #e2e8f0', borderRadius: '8px',
                                                fontSize: '0.9rem', fontFamily: "'Outfit', sans-serif",
                                                outline: 'none', boxSizing: 'border-box', background: 'white',
                                            }}
                                            value={card.descontoPercent === '' ? '' : card.descontoPercent}
                                            onChange={(e) => updateCard(idx, 'descontoPercent', e.target.value === '' ? '' : parseInt(e.target.value || '0', 10))}
                                            onFocus={() => { if (card.descontoPercent === 0) updateCard(idx, 'descontoPercent', ''); }}
                                            onBlur={() => { if (card.descontoPercent === '') updateCard(idx, 'descontoPercent', 0); }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Observações Extras</h3>

                <div className="checkbox-group" style={{ paddingBottom: '2rem' }}>
                    <input
                        type="checkbox" id="g1"
                        checked={veiculacaoG1} disabled={!temDigital}
                        onChange={(e) => setVeiculacaoG1(e.target.checked)}
                    />
                    <label htmlFor="g1" style={{ opacity: temDigital ? 1 : 0.5 }}>
                        ADICIONAR VEICULAÇÃO DIGITAL NO PATROCÍNIO (30 DIAS)
                        {!temDigital && " (Indisponível)"}
                    </label>
                </div>
            </aside>

            <main className="main-content">
                <div className="preview-scale-wrapper">
                    <div ref={cardRef}>
                        <CardPreview
                            data={previewData}
                            cards={cards.filter(c => c.active)}
                            veiculacaoG1={veiculacaoG1}
                            secundagem={selectedPatrocinio}
                        />
                    </div>
                </div>

                <div className="mobile-floating-actions">
                    <button className="mobile-home-btn" onClick={onBack} title="Início">
                        <Home size={22} />
                    </button>
                    <button className="mobile-tray-toggle" onClick={() => setIsMobileTrayOpen(true)}>
                        <Settings2 size={24} /> Editar Card
                    </button>
                    <button
                        className="mobile-copy-btn"
                        onClick={handleCopyImage}
                        style={{ backgroundColor: isCopied ? 'rgba(10,199,91,0.85)' : '' }}
                        title="Copiar Imagem"
                    >
                        {isCopied ? <Check size={22} /> : <Camera size={22} />}
                    </button>
                </div>
            </main>

            {/* Camera flash overlay */}
            {isFlashing && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'white', pointerEvents: 'none',
                    animation: 'cameraFlash 0.45s ease-out forwards',
                }} />
            )}
        </div>
    );
}
