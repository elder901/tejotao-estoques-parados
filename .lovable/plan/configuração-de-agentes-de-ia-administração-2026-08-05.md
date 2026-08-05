# Configuração de Agentes de IA (Administração)

É uma boa ideia. Hoje as instruções do Analista Comercial estão fixas dentro do código da função de backend: qualquer ajuste de comportamento depende de alteração técnica. Levando isso para uma tela de administração, você ajusta tom, regras e conhecimento do agente sem depender de código, com histórico de quem mudou o quê.

## O que será criado

**Menu Administração > Agentes de IA**

Lista dos agentes existentes (hoje: Analista Comercial) com botão para criar novos agentes.

**Tela de edição de um agente**
- Identidade: nome, descrição curta, avatar/emoji, ativo ou inativo.
- Instruções: campo grande com a missão e o estilo do agente (o texto que hoje está travado no código, já pré-carregado para edição).
- Modelo e criatividade: escolha do modelo (DeepSeek barato por padrão) e um controle simples de "mais objetivo / mais criativo".
- Skills: blocos de conhecimento reutilizáveis, cada um com título, conteúdo e liga/desliga. Exemplos para o seu caso: "Regras de venda (EVD/EVL/EVP, status N)", "Mapa de tabelas do ERP", "Ruptura e estoque", "Formato de resposta". Na conversa, o agente recebe as instruções + apenas as skills ativas.
- Permissão de consulta ao ERP: liga/desliga o acesso ao banco (somente leitura, como já é hoje).
- Prévia: testar uma pergunta na própria tela antes de publicar a alteração.

**Versionamento**
Cada salvamento cria uma versão com autor, data e motivo. Dá para ver o histórico e restaurar uma versão anterior — mesma governança já usada nas regras do ERP.

**Acesso**
Só administradores editam. Usuários Business continuam apenas conversando com os agentes.

## Detalhes técnicos

- Novas tabelas: `ai_agentes` (slug, nome, descricao, avatar, instrucoes, modelo, temperatura, permite_erp, ativo), `ai_agente_skills` (agente_id, titulo, conteudo, ordem, ativa) e `ai_agente_versoes` (snapshot jsonb, autor, motivo). RLS: leitura para autenticados, escrita apenas para `private.is_admin(auth.uid())`, com os GRANTs correspondentes.
- Migração inicial insere o Analista Comercial com o texto atual da constante `SYSTEM` já dividido em skills (regras de negócio, tabelas de fato, como consultar, formato de resposta).
- A função `analista-comercial` passa a montar o system prompt lendo o agente pelo slug + skills ativas, com fallback para o texto embutido caso o registro não exista. Modelo e temperatura vêm do banco.
- Frontend: `src/pages/AdminAgentes.tsx` (lista) e `src/pages/AdminAgenteEditar.tsx` (edição, skills e histórico), rotas em `src/App.tsx` e item no grupo Administração do `AppSidebar.tsx`.
- A prévia reaproveita a função existente com uma configuração temporária, sem gravar na conversa do usuário.