# Ruptura: 3 painéis-resumo que funcionam como filtro

Sim, dá para construir. A tela ganha três tabelas no topo (Loja, Curva ABC e Estrutura Mercadológica) com Itens ativos, Estoque 0, % Ruptura e Perda de venda. Clicar em qualquer linha filtra a listagem de produtos abaixo e recalcula as outras duas tabelas.

## Como vai funcionar

- **Por Loja**: uma linha por loja + linha "Rede".
- **Por Curva**: A1, A2, A3, B1, B2, B3, C1, C2, C3.
- **Por Estrutura Mercadológica**: o departamento que já aparece hoje na listagem (Açougue, Hortifruti, Padaria, etc.).
- Clique numa linha = filtro ativo (linha destacada); clicar de novo remove. Os filtros se combinam (ex.: Loja 002 + Curva A1).
- Os filtros de busca, fornecedor e os botões "Só zerados / Zerados + negativos" e "Só itens com venda" continuam valendo e afetam as três tabelas.
- Os selects atuais de Loja e Departamento saem, porque as tabelas passam a fazer esse papel.

## Duas coisas que ainda não existem nos dados

1. **Curva ABC** — não há esse campo hoje. Vou calcular na sincronização: ordena os itens de cada loja por valor de venda dos últimos 90 dias e classifica por participação acumulada — A até 50%, B até 80%, C o restante — cada faixa subdividida em 1/2/3. Se depois você confirmar que o ERP já tem uma curva cadastrada, trocamos para ler de lá sem mexer na tela.
2. **Itens ativos por curva e por departamento** — hoje só guardamos esse total por loja, e sem ele o "%" das duas tabelas novas não fecha. A sincronização passa a gravar os totais quebrados por loja × departamento × curva.

## Detalhes técnicos

- Migração: colunas `curva` e `participacao_venda` em `erp_ruptura_snapshot`; nova tabela `erp_ruptura_totais_detalhe` (cod_unidade, cod_departamento, departamento, curva, itens_ativos, itens_zerados, itens_negativos) com leitura para usuários autenticados, mantendo `erp_ruptura_totais` como está.
- `supabase/functions/erp-sync/index.ts`: classifica a curva por loja e popula a nova tabela de totais detalhados.
- `src/lib/erpRuptura.ts`: carrega os totais detalhados e expõe `curva` no item.
- `src/pages/Ruptura.tsx`: novo componente de painel-resumo (reutilizado 3x), estado de filtros por clique e agregações derivadas dos itens filtrados.
- Perda de venda nas tabelas = soma de `perda_dia` dos itens em ruptura daquele recorte.
- Nenhum dado de plano de ação é afetado; é preciso rodar uma sincronização depois da mudança para preencher curva e totais.
