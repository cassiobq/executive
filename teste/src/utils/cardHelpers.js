export const formatMoney = (val, decimals = 0) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const calculatePrice = (base, percent) => {
    const b = Number(base);
    const p = Number(percent);
    if (isNaN(b) || isNaN(p)) return 0;
    return b - (b * (p / 100));
};
