# Log de Atualizações de Preço

Histórico de atualizações dos dados de preço/programação usados pelo app (`src/data/programas.json`, `patrocinios.json`, `valores.json`).

## Como isso funciona hoje

- O app lê os 3 JSONs **locais** listados acima (`src/services/sheetsService.js`) — não há mais busca ao vivo em runtime.
- **Fonte confirmada em 2026-08-12:** planilha Excel `Modelo PI - Rede Anhanguera.xlsx`, aba **"Preços Globo"** (tabela mestre com todos os canais/praças/meses da rede Globo, filtrada por `canal=1` = Rede Anhanguera). O preço de tabela usado pelo app (`valor_base`, ex. campo `rio_verde`) corresponde à coluna **"30\""** dessa aba, para o `Mês`/`Ano` vigente. As demais abas (`GO1`, `GO2`, `RVD`, `LZA`, `IBI`, `CAT`, `PRT`, `JAT`) são formulários de ordem de inserção (client-specific, com desconto negociado embutido) que fazem `XLOOKUP` nessa mesma tabela — **não usar essas abas como fonte**, pois os valores já vêm com desconto/multiplicador de contrato aplicados.
- Campos `_2/_3/_4` de cada praça em `valores.json` **não são usados em nenhum lugar do código** (confirmado via grep em `src/`) — não fazem parte da atualização de preço.
- Coeficientes em `patrocinios.json` (`coeficiente_tv`, `coeficiente_dig`, `qtd_vinhetas`) são multiplicadores contratuais/estruturais, sem fonte nessa planilha de preços — não fazem parte de uma atualização mensal de preço.
- O processo de geração/sync dos JSONs roda **fora deste repositório** (provavelmente via outro agente de IA) — não há script nem workflow versionado aqui que faça esse fetch.
- Convenção: cada atualização de preço é commitada com a mensagem `Auto-update executive prices: YYYY-MM-DD HH:MM:SS` e, ao ser enviada para `main`, dispara o deploy automático (`.github/workflows/deploy.yml`).

**Ao aplicar uma nova atualização de preço, adicione uma entrada no topo da seção "Histórico" abaixo** com: data, commit, fonte usada (planilha/PDF/outro) e um resumo do que mudou.

## Histórico

### 2026-08-12 — (não commitado ainda)
- **Fonte:** `Modelo PI - Rede Anhanguera.xlsx` (aba "Preços Globo"), filtrada por `canal=1`, `Mês=8`, `Ano=2026`.
- `valores.json`: **256 valores atualizados** em 46 programas × 8 praças (campo base de cada praça; `_2/_3/_4` não tocados).
- Metodologia validada antes de aplicar: 3 combinações programa×praça sem mudança de preço bateram exatamente com o valor já salvo (HORA UM/Goiânia=988, HORA UM/Rio Verde=199, Prato do Dia/Rio Verde=324), confirmando que a coluna "30\"" da aba "Preços Globo" é a fonte correta de `valor_base`.
- ⚠️ **Anomalia observada e confirmada com o usuário:** os valores de **Porangatu (PRT) caíram ~75%** em quase todos os programas (ex. Praça TV 1ª Edição: 1.110 → 267; Jornal Nacional Seg/Sex: 2.947 → 724). Padrão consistente em vários meses da planilha (ago/set/out/nov), não um erro de leitura pontual — usuário confirmou aplicar mesmo assim.
- 3 programas (`NO BALAIO`, `PRATO DO DIA`, `JORNAL DO CAMPO`) tinham `itumbiara`/`porangatu` zerados e passaram a ter valor real — provavelmente lacuna de dados anterior.
- 6 programas (`BIGB`, `BIGF`, `CLID`, `FGAM`, `LADY`, `NOVR` — conteúdos sazonais tipo BBB) seguem zerados em todas as praças por não estarem na tabela de Agosto/2026 — sem mudança.

### 2026-07-23 15:10 — [`3d3eadb`](https://github.com/cassiobq/executive/commit/3d3eadb)
- `patrocinios.json`: 174 inserções / 87 remoções — ajuste de coeficientes e adição do campo `sigla` por programa/secundagem.

### 2026-07-23 15:06 — [`e56929a`](https://github.com/cassiobq/executive/commit/e56929a)
- `patrocinios.json`: ajuste pontual de valores (6 inserções / 6 remoções).

### 2026-07-21 14:45 — [`5f15fcb`](https://github.com/cassiobq/executive/commit/5f15fcb)
- ⚠️ Sem alteração nos JSONs de preço. Na verdade adicionou a feature "Oportunidades" (`OportunidadesCard.jsx`, `OportunidadesPage.jsx`) — commit com a mensagem de auto-update aplicada por engano.

### 2026-07-21 14:17 — [`35a6664`](https://github.com/cassiobq/executive/commit/35a6664)
- ⚠️ Sem alteração nos JSONs de preço. Alterou `App.jsx` (limpeza de código). Mesmo caso de mensagem de commit reaproveitada indevidamente.

### 2026-07-21 11:12 — [`b938c59`](https://github.com/cassiobq/executive/commit/b938c59)
- Ajuste pontual em `programas.json` e `valores.json` (1 valor cada).

### 2026-07-21 11:08 — [`63a15a0`](https://github.com/cassiobq/executive/commit/63a15a0)
- `programas.json`: reestruturação de 175 linhas (175 inserções / 175 remoções) — reorganização/correção de dados de programação.

### 2026-07-21 10:50 — [`1fb5dfa`](https://github.com/cassiobq/executive/commit/1fb5dfa) — **Migração para snapshot estático**
- Primeira aparição dos arquivos `programas.json`, `patrocinios.json` e `valores.json` (4.752 inserções no total).
- Remove a busca ao vivo via `gviz/tq?tqx=out:json` do `sheetsService.js` e passa a ler os JSONs locais.
- **Nota:** `AGENTS.md` ainda descreve a fonte de dados como "Google Sheets via gviz" (linha 16) — isso está desatualizado desde esta migração.

---

*Antes de 2026-07-21, o app buscava os dados ao vivo direto da planilha Google Sheets a cada carregamento — não havia snapshot local nem, portanto, histórico de atualização de preço a registrar aqui.*
