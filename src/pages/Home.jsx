import { useState } from 'react';
import { Tv2, FileVideo, ChevronRight, Sparkles, Search } from 'lucide-react';

const features = [
    {
        id: 'patrocinio',
        icon: Tv2,
        title: 'Patrocínio',
        description: 'Gere propostas visuais de patrocínio para programas da grade Globo',
        available: true,
        color: 'var(--primary)',
        gradient: 'linear-gradient(135deg, #5A1CDB 0%, #7B3FE4 100%)',
    },
    {
        id: 'midia-avulsa',
        icon: FileVideo,
        title: 'Mídia Avulsa',
        description: 'Propostas de inserção avulsa por programa e praça',
        available: true,
        color: '#0ac75b',
        gradient: 'linear-gradient(135deg, #0ac75b 0%, #06d68a 100%)',
    },
    {
        id: 'pesquisa-rapida',
        icon: Search,
        title: 'Pesquisa Rápida',
        description: 'Consulte os valores de 10s, 15s e 30s rapidamente por sigla ou programa',
        available: true,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)',
    },
];

export default function Home({ onNavigate }) {
    const [pressed, setPressed] = useState(null);

    return (
        <div style={{
            minHeight: '100dvh',
            background: '#F4F6FB',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif",
        }}>

            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(160deg, #3A0CA8 0%, #5A1CDB 55%, #7B3FE4 100%)',
                padding: '3.5rem 1.5rem 3rem',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative blobs */}
                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '180px', height: '180px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '-30px',
                    width: '220px', height: '220px', borderRadius: '50%',
                    background: 'rgba(255,229,0,0.07)', pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(255,229,0,0.18)', borderRadius: '50px',
                        padding: '0.3rem 0.9rem', marginBottom: '1rem',
                    }}>
                        <Sparkles size={13} color="#FFE500" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFE500', letterSpacing: '0.06em' }}>
                            TV ANHANGUERA
                        </span>
                    </div>

                    <h1 style={{
                        margin: 0, color: 'white', fontSize: '2.6rem', fontWeight: 900,
                        letterSpacing: '-0.02em', lineHeight: 1.1,
                    }}>
                        Executive
                    </h1>
                    <p style={{
                        margin: '0.6rem 0 0', color: 'rgba(255,255,255,0.65)',
                        fontSize: '0.95rem', fontWeight: 400,
                    }}>
                        Ferramentas de proposta comercial
                    </p>
                </div>
            </div>

            {/* Cards */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <p style={{
                    margin: '0 0 0.25rem', fontSize: '0.78rem', fontWeight: 700,
                    color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                    Módulos
                </p>

                {features.map((feat) => {
                    const Icon = feat.icon;
                    const isPressed = pressed === feat.id;

                    return (
                        <button
                            key={feat.id}
                            disabled={!feat.available}
                            onPointerDown={() => feat.available && setPressed(feat.id)}
                            onPointerUp={() => setPressed(null)}
                            onPointerLeave={() => setPressed(null)}
                            onClick={() => feat.available && onNavigate(feat.id)}
                            style={{
                                all: 'unset',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                background: 'white',
                                borderRadius: '16px',
                                padding: '1.2rem 1rem',
                                boxShadow: feat.available
                                    ? '0 2px 16px rgba(90,28,219,0.10)'
                                    : '0 1px 6px rgba(0,0,0,0.06)',
                                cursor: feat.available ? 'pointer' : 'default',
                                opacity: feat.available ? 1 : 0.6,
                                transform: isPressed ? 'scale(0.977)' : 'scale(1)',
                                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none',
                            }}
                        >
                            {/* Icon bubble */}
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '14px',
                                background: feat.gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: feat.available ? `0 4px 14px ${feat.color}44` : 'none',
                            }}>
                                <Icon size={26} color="white" strokeWidth={1.8} />
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E1B4B' }}>
                                        {feat.title}
                                    </span>
                                    {!feat.available && (
                                        <span style={{
                                            fontSize: '0.62rem', fontWeight: 700, color: '#94A3B8',
                                            background: '#F1F5F9', borderRadius: '50px',
                                            padding: '0.15rem 0.5rem', letterSpacing: '0.04em',
                                        }}>
                                            EM BREVE
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4, fontWeight: 400 }}>
                                    {feat.description}
                                </p>
                            </div>

                            {feat.available && (
                                <ChevronRight size={20} color="#C4B5FD" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{
                padding: '1rem 1.5rem 2rem',
                textAlign: 'center',
                color: '#CBD5E1',
                fontSize: '0.72rem',
                fontWeight: 500,
            }}>
                Executive · TV Anhanguera
            </div>
        </div>
    );
}
