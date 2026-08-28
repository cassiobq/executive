import { formatMoney } from '../utils/cardHelpers';

// Dom..Sáb (getDay() index) — mesma convenção de MapaInsercoes.jsx.
const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const SIGLA_COL = 46;
const PROGRAMA_COL = 118;
const OCORRENCIA_COL = 92;
const DESC_COL = 34;
const TOTAL_COL = 28;
const DURACAO_COL = 32;
const UNIT_COL = 50;
const ROW_TOTAL_COL = 56;

// Único dado real que temos hoje sobre a emissora (do exemplo de PI real
// fornecido pelo usuário, praça Rio Verde) — ver spec, seção "Decisões".
const RIO_VERDE_EMISSORA = {
    nome: 'TELEVISÃO RIVIERA LTDA',
    endereco: 'Rodovia BR-452, KM:01 - SETOR INDUSTRIAL, Rio Verde-GO, CEP 75.901-970',
    cnpj: 'Inscrita no CNPJ/MF sob o nº. 01.073.899/0001-35',
};

// Campo do formulário que a Mídia Avulsa ainda não coleta (dados de
// cliente/empresa) — label pequeno + caixa cinza vazia, igual ao modelo real.
const BlankField = ({ label, flex = 1 }) => (
    <div style={{ flex, minWidth: 0 }}>
        <div style={{ fontSize: '0.42rem', fontWeight: 700, color: '#333', marginBottom: '0.1rem' }}>{label}</div>
        <div style={{ height: '13px', background: '#e2e2e9', borderRadius: '2px' }} />
    </div>
);

// Réplica visual, pra exportação em PDF, do formulário real de PI (Pedido de
// Inserção) usado pra fechar uma inserção avulsa — ver
// docs/superpowers/specs/2026-08-25-exportar-pi-pdf.md. Só exibe/formata; toda
// a computação (segundagem ativa, totais, títulos usados) já vem pronta de
// MidiaAvulsaPage.jsx.
const PISlide = ({
    pracaKey,
    pracaLabel,
    monthLabelLong,
    monthLabelShort,
    year,
    monthIndex,
    daysInMonth,
    rows,
    titulosUsados,
    duracaoLabel,
    descontoPercent,
    valorTabela,
    totalMidia,
}) => {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const gridTemplate = `${SIGLA_COL}px ${PROGRAMA_COL}px ${OCORRENCIA_COL}px ${DESC_COL}px repeat(${daysInMonth}, 1fr) ${TOTAL_COL}px ${DURACAO_COL}px ${UNIT_COL}px ${ROW_TOTAL_COL}px`;
    const emissora = pracaKey === 'rio_verde' ? RIO_VERDE_EMISSORA : null;

    return (
        <div style={{
            width: '1000px',
            aspectRatio: '297 / 210',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            padding: '1rem 1.2rem',
            fontFamily: "'Outfit', sans-serif",
            color: '#111',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ flex: '0 0 140px' }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 700 }}>Escolha a praça</div>
                    <div style={{ background: '#111', color: 'white', fontWeight: 800, fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '2px' }}>
                        {pracaLabel}
                    </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.5rem', lineHeight: 1.3 }}>
                    {emissora && (
                        <>
                            <div style={{ fontWeight: 800, fontSize: '0.62rem' }}>{emissora.nome}</div>
                            <div>{emissora.endereco}</div>
                            <div>{emissora.cnpj}</div>
                        </>
                    )}
                </div>
                <div style={{ flex: '0 0 260px', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', fontSize: '0.42rem', fontWeight: 700, textAlign: 'center' }}>
                    <div>
                        <div>Mês Veiculação</div>
                        <div style={{ fontWeight: 400 }}>{monthLabelShort}</div>
                    </div>
                    <div>
                        <div>PI</div>
                        <div style={{ height: '10px' }} />
                    </div>
                    <div>
                        <div>Data de Compra Emissão</div>
                        <div style={{ fontWeight: 400 }}>{new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
            </div>
            <div style={{ background: '#fef08a', fontSize: '0.5rem', fontWeight: 700, padding: '0.1rem 0.4rem', marginBottom: '0.35rem' }}>
                Tabela Vigente: {monthLabelLong}/{year}
            </div>

            {/* Bloco cliente (em branco) */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Cliente (Nome completo sem abreviaturas)" flex={3} />
                <BlankField label="Nome contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Nome Fantasia" flex={1} />
                <BlankField label="Endereço" flex={2} />
                <BlankField label="Código contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                <BlankField label="Bairro" flex={1} />
                <BlankField label="Cidade" flex={1} />
                <BlankField label="UF" flex="0 0 40px" />
                <BlankField label="CEP" flex="0 0 70px" />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <BlankField label="Fone" flex={1} />
                <BlankField label="Fax" flex={1} />
                <BlankField label="CGC/CPF" flex={1} />
                <BlankField label="Insc. Estadual" flex={1} />
            </div>

            {/* Tabela de títulos */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ flex: 3 }}>
                    <div style={{ display: 'flex', fontSize: '0.42rem', fontWeight: 700, marginBottom: '0.1rem' }}>
                        <div style={{ flex: '0 0 14px' }} />
                        <div style={{ flex: 3 }}>Título do comercial</div>
                        <div style={{ flex: 1 }}>Duração</div>
                        <div style={{ flex: 1 }}>Produto</div>
                        <div style={{ flex: 1 }}>Seg. Mercado</div>
                    </div>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'R'].map(letra => {
                        const t = titulosUsados.find(tu => tu.letra === letra);
                        const isR = letra === 'R';
                        return (
                            <div key={letra} style={{ display: 'flex', alignItems: 'center', marginBottom: '1px' }}>
                                <div style={{
                                    flex: '0 0 14px', fontSize: '0.42rem', fontWeight: 800, textAlign: 'center',
                                    background: isR ? '#dc2626' : 'transparent', color: isR ? 'white' : '#111',
                                }}>
                                    {letra}
                                </div>
                                <div style={{ flex: 3, height: '11px', background: '#e2e2e9', marginRight: '2px', display: 'flex', alignItems: 'center', paddingLeft: '0.2rem', fontSize: '0.44rem', fontWeight: 700 }}>
                                    {t?.nome || ''}
                                </div>
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9', marginRight: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.44rem', fontWeight: 700 }}>
                                    {t ? duracaoLabel : ''}
                                </div>
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9', marginRight: '2px' }} />
                                <div style={{ flex: 1, height: '11px', background: '#e2e2e9' }} />
                            </div>
                        );
                    })}
                </div>
                <div style={{ flex: 1, fontSize: '0.42rem', fontWeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.2rem', paddingBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '10px', height: '10px', background: '#e2e2e9' }} /> Arquivado na Emissora
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '10px', height: '10px', background: '#e2e2e9' }} /> Não arquivado até o momento
                    </div>
                </div>
            </div>

            {/* Cond. Pagamento / Negociadas / Observação */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 700, marginBottom: '0.1rem' }}>Cond. Pagamento</div>
                    <div style={{ height: '11px', fontSize: '0.44rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>15 DFM</div>
                </div>
                <BlankField label="Cond. Negociadas" flex={1} />
                <BlankField label="Observação" flex={2} />
            </div>

            {/* Grade de dias */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, fontSize: '0.4rem', fontWeight: 700, color: '#333' }}>
                    <div />
                    <div />
                    <div />
                    <div />
                    {days.map(d => <div key={d} style={{ textAlign: 'center' }}>{d}</div>)}
                    <div />
                    <div />
                    <div />
                    <div />
                </div>
                <div style={{
                    display: 'grid', gridTemplateColumns: gridTemplate,
                    fontSize: '0.4rem', fontWeight: 800, color: '#111',
                    borderBottom: '1.5px solid #111', paddingBottom: '0.1rem', marginBottom: '0.1rem',
                }}>
                    <div>SIGLA</div>
                    <div>PROGRAMA</div>
                    <div>OCORRÊNCIA</div>
                    <div>DESC.%</div>
                    {days.map(d => {
                        const dow = new Date(year, monthIndex, d).getDay();
                        return <div key={d} style={{ textAlign: 'center' }}>{WEEKDAY_LETTERS[dow]}</div>;
                    })}
                    <div style={{ textAlign: 'center' }}>TOTAL</div>
                    <div style={{ textAlign: 'center' }}>Duração</div>
                    <div style={{ textAlign: 'right' }}>unit</div>
                    <div style={{ textAlign: 'right' }}>total</div>
                </div>
                {rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{
                        display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
                        minHeight: '11px', fontSize: '0.4rem',
                        backgroundColor: rowIdx % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                    }}>
                        <div style={{ fontWeight: 800 }}>{row.sigla}</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.programa}</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.36rem' }}>{row.dias}</div>
                        <div style={{ textAlign: 'center' }}>{descontoPercent}%</div>
                        {days.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontWeight: 800 }}>
                                {row.marks[d] || ''}
                            </div>
                        ))}
                        <div style={{ textAlign: 'center', fontWeight: 800 }}>{row.insercoes}</div>
                        <div style={{ textAlign: 'center' }}>{duracaoLabel}</div>
                        <div style={{ textAlign: 'right' }}>{formatMoney(row.unit, 2)}</div>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(row.total, 2)}</div>
                    </div>
                ))}
            </div>

            {/* Bloco de valores + assinaturas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', flex: 1 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>ASSINATURA DO CLIENTE</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>Área Comercial</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: '20px', borderBottom: '1px solid #111' }} />
                        <div style={{ fontSize: '0.4rem', fontWeight: 700, marginTop: '0.1rem' }}>Agência</div>
                    </div>
                </div>
                <div style={{ flex: '0 0 180px', fontSize: '0.46rem', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Valor Tabela</span><span>{formatMoney(valorTabela, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}><span>Reaplicação</span><span>-</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Desconto</span><span>{descontoPercent}%</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Mídia</span><span>{formatMoney(totalMidia, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', fontWeight: 800, borderTop: '1px solid #111', paddingTop: '0.1rem' }}>
                        <span>Bruto</span><span>{formatMoney(totalMidia, 2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PISlide;
