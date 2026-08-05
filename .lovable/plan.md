# Biblioteca de Métricas compartilhada entre agentes

## O problema (em linguagem simples)

Hoje existem três coisas diferentes misturadas — e uma delas realmente está no lugar errado:

1. **Funções de servidor** (Edge Functions): é o motor do sistema, escrito em código. Faz login, sincroniza o ERP, conversa com a IA. Não é "medida" e não deve ser editável em tela.
2. **Skills do agente**: textos de instrução — jeito de trabalhar, formato da resposta, o que priorizar. Isso é específico de cada agente e está certo onde está.
3. **Definições de métrica** (o equivalente à medida DAX): "Venda = EVD/EVL/EVP com status N", "Faturamento = SUM(mprd_valor)", "VMD = quantidade vendida / dias", "Ruptura = estoque 0 e não bloqueado". Isso hoje está **copiado dentro das skills do Analista Comercial**. É esse ponto que precisa mudar: métrica é verdade única da empresa, não opinião de um agente.

## O que será criado

**Administração > Biblioteca de Métricas**

Uma tela única com todas as definições oficiais do negócio. Cada métrica tem:
- Nome (ex.: Faturamento, Quantidade vendida, Margem %, Ticket médio, VMD, Dias de estoque, % Ruptura)
- Definição em português (o que significa para o gestor)
- Regra técnica (a fórmula e os filtros que a IA deve usar)
- Área (Comercial, Estoque, Perdas) e ativo/inativo

Ao salvar, cria uma versão com autor, data e motivo — a mesma governança já usada nas regras do ERP, para conseguir voltar atrás.

**Na tela de cada agente**

As skills continuam existindo, mas passam a ser só o "jeito de trabalhar" do agente. Aparece um novo bloco: *Métricas que este agente usa*, com caixas de seleção da biblioteca. O Analista Comercial nasce com as métricas comerciais marcadas; um futuro agente de Estoque marca as de estoque — sem recopiar texto.

Resultado prático: se um dia a regra de faturamento mudar, você altera **em um lugar só** e todos os agentes passam a responder igual.

## Migração do que já existe

As skills atuais do Analista Comercial serão separadas:
- "Regras de negócio validadas" e "Mapa das tabelas de fato" viram itens da biblioteca (compartilhados).
- "Como consultar o ERP" e "Formato da resposta" continuam como skills do agente (comportamento).

Nada é perdido: o texto atual é preservado, só muda de lugar.

## Detalhes técnicos

- Novas tabelas: `ai_metricas` (chave, nome, area, definicao, regra_tecnica, ativa), `ai_agente_metricas` (agente_id, metrica_id, ordem) e `ai_metrica_versoes` (snapshot jsonb, autor, motivo). RLS: leitura para autenticados, escrita apenas para `private.is_admin(auth.uid())`, com os GRANTs correspondentes.
- Migração de dados move o conteúdo das duas skills atuais para `ai_metricas` e vincula ao agente `comercial`.
- `supabase/functions/analista-comercial/index.ts`: `carregarConfig` passa a montar o system prompt como instruções + métricas vinculadas (ordenadas) + skills ativas; o fallback embutido é mantido.
- Frontend: `src/pages/AdminMetricas.tsx` (lista, edição e histórico), seletor de métricas em `src/pages/AdminAgenteEditar.tsx`, rota em `src/App.tsx` e item no grupo Administração do `AppSidebar.tsx`.
- A prévia do agente passa a enviar também as métricas selecionadas, para testar antes de salvar.