# Corrigir os indicadores (validação com SET/25)

Comparei a planilha de SET/25 com o que está gravado no banco. Faturamento e quantidade de itens batem; o resto tem quatro problemas reais.

## O que está certo

| Indicador (Loja 01, SET/25) | Planilha | App |
|---|---|---|
| Faturamento | 7.577.121,39 | 7.577.160,37 (diferença de R$ 39) |
| Quantidade de itens | 725.407 | 725.408 |
| Tícket por item | 10,45 | 10,45 |

## O que está errado

1. **Massa de margem / %MC** — a planilha traz margem de 2.159.258,10 (%MC 28,5%) para a Loja 01 em SET/25; o app calcula 2.647.094 (34,9%). O custo gravado está subestimado em cerca de R$ 488 mil no mês. A causa provável é a forma como o custo é somado no ERP (custo médio unitário x quantidade vs. valor já total da linha), mas isso ainda **não está confirmado** — a primeira etapa é descobrir no ERP qual expressão reproduz exatamente 5.417.863 de custo para a Loja 01 em SET/25.
2. **Número de clientes / tícket médio** — todos os meses de 2025 estão com cupons = 0 no banco (2026 tem dados). A planilha mostra 86.409 clientes na Loja 01 em SET/25. Precisa verificar se a base de cupons do ERP cobre 2025 e, se não cobrir, contar os cupons a partir da movimentação de produtos.
3. **Comparativo com o ano anterior (LY)** — não existe nenhum mês de 2024 no banco, então "mesmo mês do ano anterior" e o acumulado do ano anterior aparecem zerados. É preciso rodar a carga histórica de 2024.
4. **Fat. médio dia e margem média dia no acumulado (YTD)** — o app usa o maior número de dias de um único mês (30) em vez do total de dias do período. A planilha usa 273 dias até SET/25. Hoje o YTD por dia sai cerca de 9x maior que o correto.

## Como corrigir

### Etapa 1 — Validar as fórmulas no ERP (antes de mexer no código)
- Consultas de conferência para SET/25, Loja 01: testar variações do custo até bater com 5.417.863,29.
- Verificar se a base de cupons tem movimento em 2025 e qual chave de cupom reproduz 86.409 clientes na Loja 01.
- Conferir a diferença de R$ 39 no faturamento (provável arredondamento por linha em vez de por total).

### Etapa 2 — Ajustar a extração
- Corrigir a expressão de custo conforme o resultado da Etapa 1.
- Corrigir a contagem de cupons (ou trocar a origem, se a base de cupons não cobrir 2025).
- Recarregar 2024, 2025 e 2026 com as fórmulas corrigidas.

### Etapa 3 — Ajustar o cálculo da tela
- Somar os dias do período em vez de pegar o maior valor, para que o acumulado use os dias acumulados (273 em SET/25).
- Mês fechado continua usando os dias do próprio mês.

### Etapa 4 — Reconferir
- Comparar de novo Lojas 01/02/03 de SET/25 contra a planilha nos 9 indicadores e nas três visões antes de encerrar.

## Observações técnicas
- Arquivos afetados: `supabase/functions/erp-indicadores/index.ts` (custo, cupons, carga de 2024) e `src/lib/erpIndicadores.ts` (agregação de dias).
- A tabela `erp_indicadores_mensal` é sobrescrita por upsert em `cod_unidade,ano_mes`; nenhum dado de plano de ação é afetado.