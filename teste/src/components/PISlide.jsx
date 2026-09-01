import { formatMoney } from '../utils/cardHelpers';
import logoUrl from '../assets/tv-anhanguera-logo.jpg';

// Dom..Sáb (getDay() index) — mesma convenção de MapaInsercoes.jsx.
const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Fonte, cores e larguras de coluna abaixo foram lidas direto do
// Modelo_de_PI_Limpo.xlsx (openpyxl: fonte/tamanho/cor por célula, fill por
// célula, borda por lado, largura de coluna) — não é mais estimativa visual.
// Ver docs/superpowers/specs/2026-08-25-exportar-pi-pdf.md.
const EXCEL_FONT = "Calibri, Candara, 'Segoe UI', Optima, Arial, sans-serif";
const GRID_GRAY = '#C0C0C0'; // fill dos campos de preenchimento e cabeçalhos (indexed:22 no xlsx)
const RED_LABEL = '#FF0000'; // cor de fonte só de "Mês Veiculação" e "Data de Compra Emissão" (font.color no xlsx)
const CELL_BORDER = '1px solid #000';

// Larguras de coluna proporcionais às do Excel (A=7.7, B=29.6, C=18.4, F=8.3
// caracteres — D/E/G ficam ocultas no modelo original, por isso não têm
// coluna aqui: "MULT." e as 2 colunas de cálculo intermediário nunca aparecem
// impressas).
const SIGLA_COL = 42;
const PROGRAMA_COL = 158;
const OCORRENCIA_COL = 98;
const DESC_COL = 40;
const TOTAL_COL = 30;
const DURACAO_COL = 34;
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
// cliente/empresa) — label pequeno + caixa cinza vazia com borda, igual ao
// modelo real (fill #C0C0C0, sem borda própria — a "caixa" no Excel é só o
// preenchimento da célula, sem linha de grade ao redor dela).
const BlankField = ({ label, flex = 1 }) => (
    <div style={{ flex, minWidth: 0 }}>
        <div style={{ fontSize: '0.42rem', fontWeight: 700, color: '#000' }}>{label}</div>
        <div style={{ height: '13px', background: GRID_GRAY }} />
    </div>
);

// Caixa de assinatura: retângulo arredondado com borda preta, sem preenchimento
// — no Excel é uma forma desenhada (roundRect) por cima da planilha, não uma
// borda de célula. "ASSINATURA DO CLIENTE" é mais alta (tem o nome do cliente
// embaixo da linha); as outras duas são mais baixas.
const SignatureBox = ({ label, sublabel, tall }) => (
    <div style={{
        flex: tall ? 1.4 : 1,
        border: '1.5px solid #000',
        borderRadius: '10px',
        padding: '0.3rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: tall ? 'space-between' : 'flex-end',
        minHeight: tall ? '46px' : '30px',
    }}>
        <div />
        <div style={{ textAlign: 'center', fontSize: '0.42rem', fontWeight: 700 }}>{label}</div>
        {sublabel && <div style={{ textAlign: 'center', fontSize: '0.4rem', marginTop: '0.1rem' }}>{sublabel}</div>}
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
            fontFamily: EXCEL_FONT,
            color: '#000',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ flex: '0 0 150px' }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 400 }}>Escolha a praça</div>
                    <div style={{
                        background: '#000', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                        fontFamily: 'Tahoma, Geneva, Verdana, sans-serif',
                        padding: '0.25rem 0.4rem', textAlign: 'center',
                    }}>
                        {pracaLabel}
                    </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.44rem', lineHeight: 1.35, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {emissora && (
                        <>
                            <img src={logoUrl} alt="" style={{ height: '34px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.56rem' }}>{emissora.nome}</div>
                                <div>{emissora.endereco}</div>
                                <div>{emissora.cnpj}</div>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ flex: '0 0 220px', display: 'flex', justifyContent: 'flex-end', gap: '0.7rem', fontSize: '0.42rem', textAlign: 'center' }}>
                    <div>
                        <div style={{ color: RED_LABEL }}>Mês<br />Veiculação</div>
                        <div style={{ background: GRID_GRAY, padding: '0.1rem 0.3rem', marginTop: '0.1rem' }}>{monthLabelShort}</div>
                    </div>
                    <div>
                        <div>PI</div>
                        <div style={{ background: GRID_GRAY, height: '13px', width: '40px', marginTop: '0.1rem' }} />
                    </div>
                    <div>
                        <div style={{ color: RED_LABEL }}>Data de Compra<br />Emissão</div>
                        <div style={{ background: GRID_GRAY, padding: '0.1rem 0.3rem', marginTop: '0.1rem' }}>{new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
            </div>

            {/* Bloco cliente (em branco) */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <BlankField label="Cliente (Nome completo sem abreviaturas)" flex={3} />
                <BlankField label="Nome contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <BlankField label="Nome Fantasia" flex={1} />
                <BlankField label="Endereço" flex={2} />
                <BlankField label="Código contato/Ag" flex={1} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <BlankField label="Bairro" flex={1} />
                <BlankField label="Cidade" flex={1} />
                <BlankField label="UF" flex="0 0 40px" />
                <BlankField label="CEP" flex="0 0 70px" />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <BlankField label="Fone" flex={1} />
                <BlankField label="Fax" flex={1} />
                <BlankField label="CGC/CPF" flex={1} />
                <BlankField label="Insc. Estadual" flex={1} />
            </div>

            {/* Tabela de títulos */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ flex: 3 }}>
                    <div style={{ display: 'flex', fontSize: '0.42rem', fontWeight: 400, marginBottom: '0.15rem' }}>
                        <div style={{ flex: '0 0 14px' }} />
                        <div style={{ flex: 3 }}>Título do comercial</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Duração</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Produto</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Seg. Mercado</div>
                    </div>
                    {/* A modelo original vai até G (não R — "R" é uma legenda decorativa
                        num canto totalmente separado da planilha, sem relação com esta
                        tabela; corrigido depois de comparar com o .xlsx real). */}
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(letra => {
                        const t = titulosUsados.find(tu => tu.letra === letra);
                        return (
                            <div key={letra} style={{ display: 'flex', alignItems: 'center', marginBottom: '1px' }}>
                                <div style={{ flex: '0 0 14px', fontSize: '0.42rem', textAlign: 'center' }}>
                                    {letra}
                                </div>
                                <div style={{ flex: 3, height: '12px', background: GRID_GRAY, border: CELL_BORDER, marginRight: '2px', display: 'flex', alignItems: 'center', paddingLeft: '0.2rem', fontSize: '0.42rem', boxSizing: 'border-box' }}>
                                    {t?.nome || ''}
                                </div>
                                <div style={{ flex: 1, height: '12px', background: GRID_GRAY, border: CELL_BORDER, marginRight: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.42rem', boxSizing: 'border-box' }}>
                                    {t ? duracaoLabel : ''}
                                </div>
                                <div style={{ flex: 1, height: '12px', background: GRID_GRAY, border: CELL_BORDER, marginRight: '2px', boxSizing: 'border-box' }} />
                                <div style={{ flex: 1, height: '12px', background: GRID_GRAY, border: CELL_BORDER, boxSizing: 'border-box' }} />
                            </div>
                        );
                    })}
                </div>
                <div style={{ flex: 1, fontSize: '0.42rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.25rem', paddingBottom: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '11px', height: '11px', background: GRID_GRAY, border: CELL_BORDER, boxSizing: 'border-box' }} /> Arquivado na Emissora
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '11px', height: '11px', background: GRID_GRAY, border: CELL_BORDER, boxSizing: 'border-box' }} /> Não arquivado até o momento
                    </div>
                </div>
            </div>

            {/* Cond. Pagamento / Negociadas / Observação */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.42rem', fontWeight: 400, marginBottom: '0.1rem' }}>Cond. Pagamento</div>
                    <div style={{ height: '13px', background: GRID_GRAY, fontSize: '0.42rem', display: 'flex', alignItems: 'center', paddingLeft: '0.2rem', boxSizing: 'border-box' }}>15 DFM</div>
                </div>
                <BlankField label="Cond. Negociadas" flex={1} />
                <BlankField label="Observação" flex={2} />
            </div>

            {/* Grade de dias */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, fontSize: '0.4rem', color: '#000' }}>
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
                    fontSize: '0.4rem', fontWeight: 400, color: '#000',
                    background: GRID_GRAY, borderBottom: '2px solid #000', paddingBottom: '0.15rem', marginBottom: '1px',
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
                        display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'stretch',
                        minHeight: '13px', fontSize: '0.4rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>{row.sigla}</div>
                        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.programa}</div>
                        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.36rem' }}>{row.dias}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{descontoPercent}%</div>
                        {days.map(d => (
                            <div key={d} style={{ textAlign: 'center', border: CELL_BORDER, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {row.marks[d] || ''}
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.insercoes}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{duracaoLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{formatMoney(row.unit, 2)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 700 }}>{formatMoney(row.total, 2)}</div>
                    </div>
                ))}
            </div>

            {/* Assinaturas + bloco de valores */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', flex: 1 }}>
                    <SignatureBox label="ASSINATURA DO CLIENTE" tall />
                    <SignatureBox label="Área Comercial" />
                    <SignatureBox label="Agência" />
                </div>
                <div style={{ flex: '0 0 190px', border: CELL_BORDER, fontSize: '0.46rem', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0.4rem' }}><span>Valor Tabela</span><span>{formatMoney(valorTabela, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0.4rem', color: '#555' }}><span>Reaplicação</span><span>-</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0.4rem' }}><span>Desconto</span><span>{descontoPercent}%</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0.4rem' }}><span>Total Mídia</span><span>{formatMoney(totalMidia, 2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', fontWeight: 700, padding: '0.2rem 0.4rem', borderTop: CELL_BORDER }}>
                        <span>Bruto</span><span>{formatMoney(totalMidia, 2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PISlide;
