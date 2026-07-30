## Objetivo

Trocar a origem dos dados (arquivos TXT) por leitura direta do ERP através da conexão MCP já autorizada, mantendo o upload atual funcionando até os números baterem, e criar uma camada de **governança das regras de negócio** (o ponto mais importante do seu pedido).

## Etapa 0 — Descoberta (antes de qualquer cálculo)

Ainda não li o conteúdo do ERP, então o primeiro passo é factual, não suposição:

1. Listar as ferramentas do MCP (`/erp` → "Ver dados disponíveis").
2. Ler a tabela **dicionario** e registrar, para `movprodd`, `produn`, `produtos`, `departamentos`: nome real de cada coluna, chaves de ligação (cod_item, cod_unidade/loja, cod_departamento), o campo de tipo de movimento e o campo de quantidade.
3. Confirmar com uma amostra pequena de linhas que EVD/EVL/EVP aparecem como esperado e que a quantidade de venda tem o sinal certo.

Só depois disso escrevo as consultas definitivas. Se algo do dicionário divergir do esperado, eu te aviso antes de seguir.

## Etapa 1 — Regra de cálculo (o que será implementado)

```text
vendas_90d(item, unidade) = soma da quantidade em movprodd
                            onde tipo ∈ {EVD, EVL, EVP}
                            e data >= hoje - 90 dias

vmd (venda média diária) = vendas_90d / 90
estoque_atual           = quantidade em produn (item + unidade)
dias_de_estoque         = estoque_atual / vmd      (se vmd > 0)
                        = "sem giro"                (se vmd = 0)
valor_estoque           = estoque_atual x custo médio
```

Dimensões (descrição do produto, fornecedor, departamento) vêm de `produtos` + `departamentos`.

## Etapa 2 — Governança das regras de negócio

Esta é a espinha dorsal, em quatro camadas:

**a) Regras como parâmetros no banco (editáveis, versionadas)**
Uma tabela `regras_negocio` guarda cada parâmetro: janela de dias (90), tipos de movimento de venda (EVD/EVL/EVP), faixas de criticidade (0-30/30-60/60-90/90-120/120+), tamanho do ranking (Top 50), limite de "sem giro". Cada alteração cria uma **nova versão** com autor, data e motivo — nada é sobrescrito. Tela de administração para editar sem mexer em código, com histórico visível.

**b) Uma única função no servidor como fonte da verdade**
Todo cálculo passa por uma função de servidor (`erp-sync`) que lê os parâmetros da versão ativa. Nenhum cálculo duplicado no frontend. Cada linha calculada guarda **qual versão de regra a gerou**, então sempre dá para explicar um número antigo.

**c) Memória persistente do projeto**
As regras (fórmulas, tipos de movimento, janela, faixas) ficam registradas na memória do projeto, para que qualquer trabalho futuro respeite as mesmas definições sem você precisar repetir.

**d) Skill + agente de análise**
- Uma *skill* do projeto documenta o modelo de dados do ERP (o que o dicionário revelou) e o padrão correto de consulta, para evitar consultas inventadas.
- Um **agente de análise** dentro do app responde em linguagem natural ("por que a loja 3 subiu?", "quais itens sem giro acima de R$ 5 mil?"), usando exclusivamente a função de servidor e os parâmetros vigentes — nunca fórmulas próprias.

## Etapa 3 — Sincronização diária

- Função `erp-sync` roda 1x por dia (agendada) e também sob demanda por um botão "Atualizar agora" no Admin.
- Grava o resultado em tabelas do app: `erp_estoque_snapshot` (item, unidade, estoque, vmd, dias, valor, versão da regra, data) e `erp_sync_log` (início, fim, linhas, erros).
- Dashboard passa a ler o snapshot: rápido e funciona mesmo se o ERP estiver fora do ar.

## Etapa 4 — Validação lado a lado

Uma tela de comparação mostra, para os mesmos itens, o número vindo do TXT e o vindo do ERP, com a diferença. O upload continua ativo até você aprovar. Depois disso, desligamos o upload em um passo separado.

## Detalhes técnicos

- Backend: novas tabelas `regras_negocio`, `regras_negocio_versoes`, `erp_estoque_snapshot`, `erp_sync_log`, todas com RLS (leitura para autenticados, escrita só admin/serviço).
- `supabase/functions/erp-sync/index.ts`: reutiliza o proxy MCP existente em `erp-mcp` (refresh de token já implementado), pagina as consultas, calcula e grava em lote.
- Agendamento via `pg_cron` + `pg_net`.
- Frontend: `src/pages/Admin.tsx` ganha "Sincronizar agora" e status do último sync; nova tela de Regras; `src/lib/csvParser.ts` intocado nesta fase (fonte alternativa).
- Agente de análise: AI SDK + Lovable AI Gateway, com ferramentas restritas ao snapshot e aos parâmetros.

## Ordem de execução

1. Descoberta do dicionário e das tabelas (relatório para você).
2. Tabelas de regras + snapshot.
3. Função `erp-sync` + agendamento.
4. Tela de Regras (governança) + memória + skill.
5. Dashboard lendo o snapshot + tela de comparação TXT × ERP.
6. Agente de análise.
