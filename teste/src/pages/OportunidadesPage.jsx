import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings2, Check, Camera, Home } from 'lucide-react';
import { fetchAllSheetData } from '../services/sheetsService';
import OportunidadesCard from '../components/OportunidadesCard';

// Helper to parse numbers safely
const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9,-]+/g, '').replace(',', '.');
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

const OPORTUNIDADES = [
    { key: 'feliz-cidade', label: 'FELIZ CIDADE', incentivo: 'PRODUÇÃO DE VT GRÁTIS', desconto: 60 }
];

const STRATEGIES = [
    { key: 'mais-insercoes', label: 'Mais Inserções (Foco Frequência)' },
    { key: 'mais-impactos', label: 'Mais Impactos (Foco Alcance)' }
];

// Valores Mínimos Líquidos (com desconto aplicado) definidos no plano aprovado
const VALORES_MINIMOS = {
    goiania: { 15: 3500, 30: 5000 },
    anapolis: { 15: 1800, 30: 2500 },
    rio_verde: { 15: 2000, 30: 3000 },
    luziania: { 15: 1800, 30: 2500 },
    itumbiara: { 15: 1400, 30: 2000 },
    catalao: { 15: 1400, 30: 2000 },
    porangatu: { 15: 1000, 30: 1500 },
    jatai: { 15: 1200, 30: 1800 }
};

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getNextMonths = () => {
    const currentMonthIdx = new Date().getMonth();
    return Array.from({ length: 4 }).map((_, i) => {
        const idx = (currentMonthIdx + i) % 12;
        return {
            label: MONTH_NAMES[idx],
            offset: i === 0 ? '' : `_${i + 1}`
        };
    });
};

export default function OportunidadesPage({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState({ programas: [], patrocinios: [] });
    
    // States
    const [selectedOportunidade, setSelectedOportunidade] = useState('feliz-cidade');
    const [selectedPraca, setSelectedPraca] = useState('rio_verde');
    const [selectedSecundagem, setSelectedSecundagem] = useState(30);
    const [selectedStrategy, setSelectedStrategy] = useState('mais-insercoes');
    const [descontoPercent, setDescontoPercent] = useState(60);
    const [availableMonths] = useState(getNextMonths());
    const [selectedMonthOffset, setSelectedMonthOffset] = useState('');
    
    const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    
    const cardRef = useRef(null);

    // Carrega dados iniciais locais
    useEffect(() => {
        fetchAllSheetData().then(res => {
            setDb(res);
            setLoading(false);
        });
    }, []);

    // Atualiza o desconto se a oportunidade mudar (Feliz Cidade padrão = 60)
    useEffect(() => {
        const opt = OPORTUNIDADES.find(o => o.key === selectedOportunidade);
        if (opt) {
            setDescontoPercent(opt.desconto);
        }
    }, [selectedOportunidade]);

    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", color: '#5A1CDB', fontSize: '1rem', fontWeight: 600 }}>
            Carregando dados...
        </div>
    );

    // --- ALGORITMO DE OTIMIZAÇÃO DA GRADE (FELIZ CIDADE) ---
    const pracaLabel = PRACAS.find(p => p.key === selectedPraca)?.label || selectedPraca;
    const optLabel = OPORTUNIDADES.find(o => o.key === selectedOportunidade)?.label || selectedOportunidade;
    const incentivoLabel = OPORTUNIDADES.find(o => o.key === selectedOportunidade)?.incentivo || 'PRODUÇÃO INCLUSA';
    const monthLabel = availableMonths.find(m => m.offset === selectedMonthOffset)?.label || '';

    // Monta a chave correta para ler os preços (ex: 'rio_verde', 'rio_verde_2', etc.)
    const colKey = selectedMonthOffset ? `${selectedPraca}${selectedMonthOffset}` : selectedPraca;
    const targetMin = VALORES_MINIMOS[selectedPraca]?.[selectedSecundagem] || 2000;
    const targetMax = targetMin * 1.05;

    // Filtra programas locais válidos para o Feliz Cidade
    const regionais = ['BPRA', 'PTV1', 'PTV2', 'BOMS', 'PT2S', 'JOCA', 'NOBA', 'PDDA'];
    const elegiveis = db.programas
        .filter(p => {
            const sigla = String(p.sigla || '').trim().toUpperCase();
            const precoBase = parseNum(p[colKey]);
            return regionais.includes(sigla) && precoBase > 0;
        })
        .map(p => {
            const precoBase = parseNum(p[colKey]);
            // Regra de secundagem
            const coef = selectedSecundagem === 15 ? parseNum(p.coeficiente_15 || 0.5) : 1;
            const unitBruto = precoBase * coef;
            const unitLiquido = unitBruto * (1 - descontoPercent / 100);
            const audiencia = parseNum(p.audiencia_rvd || 0);
            
            // Custo-benefício de impacto
            const ratio = unitLiquido > 0 ? audiencia / unitLiquido : 0;

            return {
                ...p,
                unitBruto,
                unitLiquido,
                audiencia,
                ratio,
                insercoes: 0
            };
        });

    let optimizedRows = [];
    if (elegiveis.length > 0) {
        // Ordena de acordo com a estratégia
        if (selectedStrategy === 'mais-insercoes') {
            elegiveis.sort((a, b) => a.unitLiquido - b.unitLiquido); // mais barato primeiro
        } else {
            elegiveis.sort((a, b) => b.ratio - a.ratio); // melhor custo/benefício de impacto
        }

        // Loop de distribuição algorítmica
        let currentTotal = 0;
        let loopCount = 0;
        const maxLoops = 200; // Evita loop infinito
        
        while (currentTotal < targetMin && loopCount < maxLoops) {
            const prog = elegiveis[loopCount % elegiveis.length];
            prog.insercoes += 1;
            currentTotal += prog.unitLiquido;
            loopCount++;
        }

        // Refinamento de teto (tenta tirar inserções caras para encaixar no limite de +5%)
        if (currentTotal > targetMax) {
            const sortedByPriceDesc = [...elegiveis]
                .filter(p => p.insercoes > 0)
                .sort((a, b) => b.unitLiquido - a.unitLiquido);
                
            for (const prog of sortedByPriceDesc) {
                while (prog.insercoes > 0 && currentTotal - prog.unitLiquido >= targetMin) {
                    prog.insercoes -= 1;
                    currentTotal -= prog.unitLiquido;
                }
            }
        }

        // Filtra os selecionados
        optimizedRows = elegiveis
            .filter(p => p.insercoes > 0)
            .map(p => ({
                programa: p.programa,
                sigla: p.sigla,
                dias: p.dias,
                horario: p.horario,
                insercoes: p.insercoes,
                valorBruto: p.unitBruto * p.insercoes,
                valorLiquido: p.unitLiquido * p.insercoes,
                audienciaTotal: p.audiencia * p.insercoes
            }));
    }

    const totalVisualizacoes = optimizedRows.reduce((sum, r) => sum + r.audienciaTotal, 0);

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
                link.download = 'oportunidade-feliz-cidade.png';
                link.href = dataUrl;
                link.click();
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch {
                alert('Erro ao salvar imagem. Tente novamente.');
            }
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            background: '#FAFBFD',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header Barra Superior */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid rgba(90,28,219,0.08)',
                padding: '0.8rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <button onClick={onBack} style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Voltar
                </button>
                <div style={{ fontWeight: 800, color: '#1E1B4B', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                    Oportunidades Comerciais
                </div>
                <button onClick={() => setIsMobileTrayOpen(true)} className="mobile-only-btn" style={{ all: 'unset', color: 'var(--primary)', cursor: 'pointer', display: 'none' }}>
                    <Settings2 size={20} />
                </button>
            </header>

            {/* Layout Split Screen */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                
                {/* 1. Área de Preview do Card */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                    position: 'relative',
                    overflowY: 'auto',
                }}>
                    <div ref={cardRef} style={{
                        transform: 'scale(1)',
                        transition: 'transform 0.2s',
                        position: 'relative'
                    }} className={isFlashing ? 'flash-animation' : ''}>
                        <OportunidadesCard 
                            oportunidadeLabel={optLabel}
                            incentivoLabel={incentivoLabel}
                            praca={pracaLabel}
                            tableRows={optimizedRows}
                            secundagem={selectedSecundagem}
                            descontoPercent={descontoPercent}
                            totalVisualizacoes={totalVisualizacoes}
                            month={monthLabel}
                        />
                    </div>
                </div>

                {/* 2. Sidebar de Configurações */}
                <aside className="sidebar-desktop" style={{
                    width: '380px',
                    background: 'white',
                    borderLeft: '1px solid rgba(90,28,219,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '-4px 0 20px rgba(0,0,0,0.02)',
                }}>
                    <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#1E1B4B' }}>Configurar Card</h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>Personalize os parâmetros da oportunidade comercial</p>
                        </div>

                        {/* Dropdown Oportunidade */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Oportunidade</label>
                            <select value={selectedOportunidade} onChange={e => setSelectedOportunidade(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', background: '#F8FAFC', outline: 'none' }}>
                                {OPORTUNIDADES.map(o => (
                                    <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Dropdown Praça */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Praça Comercial</label>
                            <select value={selectedPraca} onChange={e => setSelectedPraca(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', background: '#F8FAFC', outline: 'none' }}>
                                {PRACAS.map(p => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Seletor Secundagem */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secundagem</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[15, 30].map(s => (
                                    <button key={s} onClick={() => setSelectedSecundagem(s)} style={{
                                        flex: 1, padding: '0.6rem 0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                                        background: selectedSecundagem === s ? 'var(--primary)' : '#F1F5F9',
                                        color: selectedSecundagem === s ? 'white' : '#475569',
                                        transition: 'all 0.15s'
                                    }}>
                                        {s} segundos
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dropdown Esquema de Grade */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Esquema de Inserções</label>
                            <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', background: '#F8FAFC', outline: 'none' }}>
                                {STRATEGIES.map(s => (
                                    <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Input Desconto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desconto Especial (%)</label>
                            <input type="number" min="0" max="100" value={descontoPercent} onChange={e => setDescontoPercent(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', outline: 'none' }} />
                        </div>

                        {/* Dropdown Mês */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mês Vigente</label>
                            <select value={selectedMonthOffset} onChange={e => setSelectedMonthOffset(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', background: '#F8FAFC', outline: 'none' }}>
                                {availableMonths.map(m => (
                                    <option key={m.offset} value={m.offset}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Botão de Copiar */}
                    <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(90,28,219,0.08)' }}>
                        <button onClick={handleCopyImage} style={{
                            width: '100%', padding: '0.9rem', borderRadius: '12px', background: isCopied ? 'var(--success)' : 'var(--primary)',
                            color: 'white', border: 'none', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            boxShadow: isCopied ? '0 6px 20px rgba(10,199,91,0.3)' : '0 6px 20px rgba(90,28,219,0.3)',
                            transition: 'all 0.2s'
                        }}>
                            {isCopied ? (
                                <>
                                    <Check size={18} /> Copiado!
                                </>
                            ) : (
                                <>
                                    <Camera size={18} /> Copiar Proposta (PNG)
                                </>
                            )}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Gaveta Mobile (Bottom Tray) */}
            {isMobileTrayOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div onClick={() => setIsMobileTrayOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
                    <div style={{
                        position: 'relative', background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto'
                    }}>
                        <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '2px', margin: '-0.5rem auto 0.5rem' }} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Filtros</h3>
                        
                        {/* Seletor Oportunidade Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Oportunidade</label>
                            <select value={selectedOportunidade} onChange={e => setSelectedOportunidade(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                                {OPORTUNIDADES.map(o => (
                                    <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Seletor Praça Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Praça</label>
                            <select value={selectedPraca} onChange={e => setSelectedPraca(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                                {PRACAS.map(p => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Seletor Secundagem Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Secundagem</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[15, 30].map(s => (
                                    <button key={s} onClick={() => setSelectedSecundagem(s)} style={{
                                        flex: 1, padding: '0.6rem 0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none',
                                        background: selectedSecundagem === s ? 'var(--primary)' : '#F1F5F9',
                                        color: selectedSecundagem === s ? 'white' : '#475569'
                                    }}>
                                        {s}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seletor Esquema Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Esquema</label>
                            <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                                {STRATEGIES.map(s => (
                                    <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Seletor Desconto Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Desconto (%)</label>
                            <input type="number" min="0" max="100" value={descontoPercent} onChange={e => setDescontoPercent(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }} />
                        </div>

                        {/* Seletor Mês Mobile */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Mês</label>
                            <select value={selectedMonthOffset} onChange={e => setSelectedMonthOffset(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                                {availableMonths.map(m => (
                                    <option key={m.offset} value={m.offset}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={() => setIsMobileTrayOpen(false)} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Aplicar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
