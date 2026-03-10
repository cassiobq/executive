# AGENTS.md — Contexto para IAs

Este arquivo resume o projeto para qualquer agente de IA que for trabalhar neste repositório.

## O que é este projeto?

**Executive** é uma PWA React/Vite que gera cards visuais de proposta de patrocínio de TV.  
Um vendedor escolhe programa, praça e secundagem, configura 1 a 3 cards de preço com período e desconto, e copia/baixa a imagem resultante para enviar ao cliente.

## Stack

- **Framework:** Vite + React (JSX)
- **Estilo:** Vanilla CSS (`src/index.css`) com variáveis CSS
- **Ícones:** `lucide-react`
- **Imagem:** `html-to-image` (toBlob/toPng)
- **Dados:** Google Sheets via `gviz/tq?tqx=out:json` (sem autenticação)
- **Deploy:** GitHub Actions → GitHub Pages (`base: '/executive/'`)

## Arquivos-chave

| Arquivo | Responsabilidade |
|---|---|
| `src/App.jsx` | Estado global, cálculos, layout principal, sidebar, floating buttons |
| `src/components/CardPreview.jsx` | Renderização do card 9:16, escalamento de fonte, observações |
| `src/services/sheetsService.js` | Fetch das 2 abas do Google Sheets, parse de datas/horas |
| `src/index.css` | Design tokens, sidebar, liquid glass, tray, preview scaling |
| `index.html` | PWA meta tags, manifest, apple-touch-icon |
| `public/manifest.json` | PWA manifest (base: `/executive/`) |
| `.github/workflows/deploy.yml` | CI/CD para GitHub Pages |
| `PRD.md` | Documentação completa do produto |

## Estrutura de Dados (Google Sheets)

**Sheet `programas`** — uma linha por programa  
Colunas importantes: `programa`, `dias`, `horario`, `insercoes_mes`, `audiencia_rvd`, `share_rvd`, `sexo_rvd`, `classe_rvd`, `idade_rvd`  
**Praças como colunas:** `GOIANIA`, `ANAPOLIS`, `RIO VERDE`, `LUZIANIA`, `ITUMBIARA`, `CATALAO`, `PORANGATU`, `JATAI`  
→ O valor da coluna da praça selecionada é o `valor_base`.

**Sheet `patrocinios`** — uma linha por (programa × secundagem)  
Colunas: `programa`, `secundagem`, `coeficiente_tv`, `coeficiente_dig`, `qtd_vinhetas`

## Fórmula de Preço

```
precoTv = valor_base × coeficiente_tv × qtd_vinhetas × insercoes_mes
precoDig = precoTv × coeficiente_dig  (se digital ativado)
precoBaseMensal = precoTv + precoDig
precoCard = precoBaseMensal × (1 - desconto%)
```

## Regras Importantes

1. **Praças** são colunas na sheet `programas` (não linhas). Filtradas pelas que têm `valor_base != ''`.
2. **Rio Verde** é a praça padrão. Dados de audiência/perfil só aparecem nessa praça.
3. **`horario`** vem do gviz como string `"Date(1899,11,30,HH,MM,0)"` — convertido para `"HH:MM"` no `sheetsService`.
4. Ao trocar de **programa**, a praça **não é resetada** se ainda for válida para o novo programa.
5. **Copiar imagem:** tenta `navigator.clipboard.write` (Chrome); fallback: download PNG (Safari).
6. **1 card:** layout 2 linhas inline. **2–3 cards:** layout empilhado.
7. **"de X/mês por"** só aparece se `descontoPercent > 0`.
8. Fontes dos cards de preço escalam com `fontScale` (1× = 3 cards, 1.35× = 2 cards, 1.8× = 1 card).

## Rodar Localmente

```bash
npm install
npm run dev
# → http://localhost:5173/executive/
```

## Fazer Deploy

```bash
git add .
git commit -m "mensagem"
git push origin main
# GitHub Actions faz o deploy automaticamente em ~2min
# URL: https://cassiobq.github.io/executive/
```

## Funcionalidade Futura

- **Mídia Avulsa** usando `coeficiente_15` e `coeficiente_10` da sheet `programas` (colunas já existem, lógica ainda não implementada).
