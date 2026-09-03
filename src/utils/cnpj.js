// Validação, formatação e consulta de CNPJ pra preencher os dados de
// cliente da PI automaticamente — o usuário só digita o CNPJ.
//
// Fonte: BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj}), que
// agrega o cadastro público da Receita Federal. Pública, sem chave, com
// CORS liberado pra chamada direta do navegador — combina com este app,
// que é 100% estático e sem backend.
//
// O mapeamento pros campos que a PI usa (ver CLIENTE_CELLS em piXlsx.js)
// é feito aqui, não em piXlsx.js: piXlsx.js só sabe escrever um objeto
// `cliente` já normalizado, sem depender do formato de resposta de uma
// API específica.

export function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

export function isValidCnpjLength(value) {
    return onlyDigits(value).length === 14;
}

// Aplica a máscara XX.XXX.XXX/XXXX-XX progressivamente, mesmo com CNPJ
// incompleto — usado no campo enquanto o usuário digita.
export function maskCnpjInput(value) {
    const d = onlyDigits(value).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Formata um CNPJ completo (14 dígitos) — usado pro campo CGC/CPF da PI,
// a partir do CNPJ que a própria API devolve (já validado por ela).
export function formatCnpj(value) {
    const d = onlyDigits(value).slice(0, 14);
    if (d.length < 14) return d;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

export function formatCep(value) {
    const d = onlyDigits(value).slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// BrasilAPI devolve ddd_telefone_1 como dígitos corridos (DDD + número),
// sem formatação — 10 dígitos pra fixo, 11 pra celular (9º dígito).
export function formatTelefone(value) {
    const d = onlyDigits(value);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
}

// Traduz a resposta da BrasilAPI pros campos que a PI usa. Só os que uma
// consulta de CNPJ pode preencher com confiança: contato/agência, fax e
// inscrição estadual não vêm dessa fonte e ficam de fora (o usuário
// preenche à mão, se precisar).
export function mapCnpjResponseToCliente(data) {
    if (!data) return null;
    const logradouro = [data.descricao_tipo_de_logradouro, data.logradouro]
        .filter(Boolean).join(' ').trim();
    const enderecoBase = [logradouro, data.numero].filter(Boolean).join(', ');
    const endereco = data.complemento ? `${enderecoBase} - ${data.complemento}` : enderecoBase;
    return {
        nome: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        endereco,
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
        cep: formatCep(data.cep),
        fone: formatTelefone(data.ddd_telefone_1),
        cgc: formatCnpj(data.cnpj),
    };
}

const CNPJ_API_URL = 'https://brasilapi.com.br/api/cnpj/v1/';

// Busca os dados do CNPJ e já devolve no formato que a PI usa. Lança com
// uma mensagem em pt-BR apresentável direto num alert/dialog — quem chama
// não precisa traduzir status HTTP.
export async function fetchCnpjData(cnpjValue) {
    const digits = onlyDigits(cnpjValue);
    if (digits.length !== 14) {
        throw new Error('CNPJ precisa ter 14 dígitos.');
    }
    let res;
    try {
        res = await fetch(`${CNPJ_API_URL}${digits}`);
    } catch {
        throw new Error('Sem conexão pra consultar o CNPJ agora.');
    }
    if (res.status === 404) {
        throw new Error('CNPJ não encontrado.');
    }
    if (!res.ok) {
        throw new Error('Não foi possível consultar o CNPJ agora. Tente de novo.');
    }
    const data = await res.json();
    return mapCnpjResponseToCliente(data);
}
