# Analistas de IA — Analista Comercial

Nova área do portal com "analistas" de IA. O primeiro é o **Analista Comercial**: um chat onde qualquer usuário pergunta em português sobre o negócio ("qual produto mais vendeu em julho?", "como vendemos por dia da semana?") e a IA consulta o ERP ao vivo para responder com números reais.

## O que será criado

**Menu**: novo grupo **Analistas de IA** na barra lateral, com o item **Analista Comercial** (espaço reservado para futuros analistas: Estoque, Prevenção de Perdas).

**Tela do Analista Comercial**
- Avatar/ilustração do analista + nome e descrição do que ele sabe responder.
- Lista lateral de conversas (histórico salvo no banco, por usuário), botão "Nova conversa" e link próprio por conversa.
- Sugestões de perguntas prontas na tela vazia (top produtos, vendas por dia da semana, comparativo de lojas, ticket médio).
- Resposta em streaming, com um bloco recolhido mostrando "consultando o ERP" e a consulta usada, para você conferir a origem do número.

## Como a IA busca os números

A IA não inventa dados: ela tem uma ferramenta que executa consultas somente-leitura no ERP pelo MCP já conectado (mesmo caminho usado hoje pelas sincronizações). No prompt ela recebe o dicionário das tabelas relevantes (movprodd, produtos, produn, departamentos), as regras já validadas com você — vendas = EVD/EVL/EVP, status `N`, quantidade em `mprd_qtde`, valor em `mprd_total` — e devolve a resposta em texto, com tabela quando fizer sentido.

Proteções: apenas `SELECT`, limite de linhas e de tempo por consulta, e recusa de qualquer consulta de escrita.

## OpenRouter + DeepSeek

Usaremos a OpenRouter com o DeepSeek (barato) como modelo padrão. Para isso preciso que você crie a chave em openrouter.ai (Keys → Create key) e a salve no app quando eu pedir — a chave fica apenas no servidor, nunca no navegador. Se quiser, dá para trocar o modelo depois sem mexer no resto.

## Detalhes técnicos

- Banco: tabelas `ai_threads` (id, user_id, título, timestamps) e `ai_messages` (thread_id, papel, partes JSON, timestamps), com GRANTs e RLS por `auth.uid()`.
- Secret: `OPENROUTER_API_KEY` (solicitado via formulário seguro).
- Edge Function `analista-comercial`: valida o JWT, carrega/salva o histórico da thread, chama a OpenRouter (`deepseek/deepseek-chat`) em streaming com tool calling; a tool `consultar_erp` reaproveita `runErpSql`/`getErpToken` de `supabase/functions/_shared/erpMcp.ts` (com os placeholders `{{fact_movprodd}}` / `{{fact_vdadet}}`), com loop limitado de passos.
- Frontend: rotas `/analistas` (lista de analistas) e `/analistas/comercial/:threadId` dentro do `AppLayout`; thread ativa vem da URL (`useParams`), nova conversa navega para a nova URL, chat remontado por `threadId`.
- UI de chat com os componentes AI Elements (conversation, message, prompt-input, tool, shimmer); avatar gerado como imagem do analista.
- Erros de crédito/limite da OpenRouter aparecem como aviso claro na tela.
