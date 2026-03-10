# PRD — Executive Patrocínios

## Visão Geral

**Executive** é uma aplicação web mobile-first que gera cards visuais de proposta de patrocínio para programas da grade Globo. O vendedor preenche os parâmetros (programa, praça, secundagem, descontos) e obtém uma imagem pronta para enviar ao cliente.

- **URL produção:** https://cassiobq.github.io/executive/
- **Repositório:** https://github.com/cassiobq/executive
- **Stack:** Vite + React, deploy via GitHub Actions → GitHub Pages
- **PWA:** manifest.json + apple-touch-icon para instalação na tela inicial

---

## Fonte de Dados

Google Sheets ID: `18-EHWUjs02gmFFrD2V17rD3WqouPEcggsft4vf8CGj8`  
Acesso via Google Visualization API (`gviz/tq?tqx=out:json`).

### Sheet `programas`

| Coluna | Descrição |
|---|---|
| `sigla` | Código do programa (ex: BPRA) |
| `programa` | Nome completo |
| `dias` | Dias de exibição (ex: Seg/Sex) |
| `horario` | Horário de exibição (HH:MM) |
| `insercoes_mes` | Número de inserções por mês |
| `coeficiente_15` | Coeficiente mídia avulsa 15s *(uso futuro)* |
| `coeficiente_10` | Coeficiente mídia avulsa 10s *(uso futuro)* |
| `GOIANIA` … `JATAI` | **Valor base (R$) por praça** — cada praça é uma coluna |
| `audiencia_rvd` | Audiência estimada (Rio Verde) |
| `share_rvd` | Share entre as TVs (Rio Verde) |
| `sexo_rvd` | Perfil de sexo (Rio Verde) |
| `classe_rvd` | Perfil de classe social (Rio Verde) |
| `idade_rvd` | Perfil de faixa etária (Rio Verde) |

### Sheet `patrocinios`

| Coluna | Descrição |
|---|---|
| `programa` | Nome do programa (chave de join) |
| `secundagem` | Duração da vinheta em segundos (3, 5, 7, 10, 15) |
| `coeficiente_tv` | Multiplicador de preço TV |
| `coeficiente_dig` | Multiplicador digital (vazio = sem digital) |
| `qtd_vinhetas` | Quantidade de vinhetas por inserção |

---

## Lógica de Cálculo

```
Praças disponíveis   = colunas da sheet programas com valor ≠ vazio para o programa
valor_base           = programas[selectedPraca]
InsercõesTvMes       = qtd_vinhetas × insercoes_mes
precoTv              = valor_base × coeficiente_tv × qtd_vinhetas × insercoes_mes
precoDig             = precoTv × coeficiente_dig  (se digital ativo e disponível)
precoBaseMensal      = precoTv + precoDig
VisualizacoesMes     = audiencia_rvd × insercoes_mes × qtd_vinhetas
                       (somente praça Rio Verde com audiencia_rvd preenchida)
precoCard(n)         = precoBaseMensal × (1 - desconto_n / 100)
```

---

## Interface

### Componentes

- **Sidebar / Bottom Tray** — painel de configuração do card (mobile: gaveta animada)
- **CardPreview** — card 9:16 (450px wide) com aspect-ratio fixo, renderizado com Outfit font
- **Floating Action Buttons** — "Editar Card" (roxo, liquid glass) + câmera circular (verde)

### Controles do Usuário

| Controle | Comportamento |
|---|---|
| Programa | Dropdown alfabético. Praça NÃO é resetada ao trocar, a menos que o novo programa não tenha a praça atual |
| Praça | Rio Verde sempre primeiro; demais alfabéticas. Filtra colunas com `valor_base` preenchido |
| Secundagem | Filtra por `patrocinios.programa` = selecionado |
| Nº de Cards | Botão 1 / 2 / 3. Sidebar exibe configs apenas dos cards visíveis |
| Período (Meses) | Número livre por card |
| Desconto (%) | Número livre por card. Se 0, esconde linha "de X/mês por" |
| Veiculação Digital | Checkbox; desativado se programa não tiver `coeficiente_dig` |

### Card Preview — Seções

1. **Header** — "PATROCÍNIO / NOME PROGRAMA / PRAÇA"
2. **Info** — HORÁRIO, DIAS, INSERÇÕES/MÊS TV, DIAS VEICULAÇÃO DIGITAL (se ativo)  
   *Somente Rio Verde com dados:* AUDIÊNCIA ENTRE AS TV's, PERFIL
3. **Banner de Visualizações** — verde, somente Rio Verde + `audiencia_rvd` preenchida
4. **Cards de Preço (1–3)** — cabeçalho amarelo, corpo roxo, font escalável
   - 1 card: layout 2 linhas inline ("de X/mês por" + "VALOR /mês")
   - 2–3 cards: layout empilhado
   - Badge "X% OFF" somente quando `descontoPercent > 0`
5. **Observações** — bullet list gerada por regras de secundagem + bullet de pagamento  
   `* audiência estimada...` → somente quando banner de visualizações está visível

---

## Regras de Observações (Secundagem)

| Segundos | Palavras |
|---|---|
| 3s | 4 |
| 5s | 10 |
| 7s | 12 |
| 10s | 12 |
| 15s | 12 |

Observação sempre gerada: *"pagamento para dia 15 do próximo mês"*

---

## Escalabilidade de Fonte (Cards de Preço)

| Chars do preço | Font base | × scale (2 cards) | × scale (1 card) |
|---|---|---|---|
| ≤ 5 | 2.5rem | 3.4rem | 4rem (cap) |
| 6 | 2.1rem | 2.8rem | 3.8rem |
| 7 | 1.8rem | 2.4rem | 3.2rem |
| ≥ 8 | 1.5rem | 2.0rem | 2.7rem |

---

## Copiar Imagem

1. **Chrome/Edge** — `navigator.clipboard.write` com `ClipboardItem` (copia para área de transferência)
2. **Safari/Firefox** — fallback: baixa o arquivo `card-executive.png` automaticamente

---

## Praças Disponíveis

`GOIÂNIA`, `ANÁPOLIS`, `RIO VERDE`, `LUZIÂNIA`, `ITUMBIARA`, `CATALÃO`, `PORANGATU`, `JATAÍ`

> Rio Verde é a praça padrão ao carregar o app. Dados de audiência/perfil são exclusivos de Rio Verde.

---

## Deploy

- **Branch:** `main`
- **GitHub Actions:** `.github/workflows/deploy.yml` — build `npm run build` → deploy para `gh-pages`
- **Vite config:** `base: '/executive/'`
- **Iniciar local:** `npm run dev` → http://localhost:5173/executive/

---

## Funcionalidades Futuras

- **Mídia Avulsa** — usar `coeficiente_15` e `coeficiente_10` da sheet `programas` para modalidade de anúncio avulso (não patrocínio)
