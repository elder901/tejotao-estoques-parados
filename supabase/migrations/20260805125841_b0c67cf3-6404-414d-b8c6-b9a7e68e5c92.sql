CREATE TABLE public.ai_agentes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '',
  instrucoes text NOT NULL DEFAULT '',
  modelo text NOT NULL DEFAULT 'deepseek/deepseek-chat',
  temperatura numeric NOT NULL DEFAULT 0.2,
  permite_erp boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agentes TO authenticated;
GRANT ALL ON public.ai_agentes TO service_role;
ALTER TABLE public.ai_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler agentes" ON public.ai_agentes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar agentes" ON public.ai_agentes
  FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem editar agentes" ON public.ai_agentes
  FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem excluir agentes" ON public.ai_agentes
  FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));

CREATE TRIGGER update_ai_agentes_updated_at BEFORE UPDATE ON public.ai_agentes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_agente_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id uuid NOT NULL REFERENCES public.ai_agentes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agente_skills TO authenticated;
GRANT ALL ON public.ai_agente_skills TO service_role;
ALTER TABLE public.ai_agente_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler skills" ON public.ai_agente_skills
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar skills" ON public.ai_agente_skills
  FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem editar skills" ON public.ai_agente_skills
  FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem excluir skills" ON public.ai_agente_skills
  FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));

CREATE TRIGGER update_ai_agente_skills_updated_at BEFORE UPDATE ON public.ai_agente_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ai_agente_skills_agente_idx ON public.ai_agente_skills (agente_id, ordem);

CREATE TABLE public.ai_agente_versoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id uuid NOT NULL REFERENCES public.ai_agentes(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  motivo text NOT NULL DEFAULT '',
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_agente_versoes TO authenticated;
GRANT ALL ON public.ai_agente_versoes TO service_role;
ALTER TABLE public.ai_agente_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler versoes de agente" ON public.ai_agente_versoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar versoes de agente" ON public.ai_agente_versoes
  FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()) AND criado_por = auth.uid());

CREATE INDEX ai_agente_versoes_agente_idx ON public.ai_agente_versoes (agente_id, created_at DESC);

INSERT INTO public.ai_agentes (slug, nome, descricao, avatar, instrucoes, modelo, temperatura, permite_erp, ativo)
VALUES (
  'comercial',
  'Analista Comercial',
  'Responde perguntas de vendas, produtos, lojas, margem e ticket usando os dados do ERP.',
  '📊',
  $ins$Você é o Analista Comercial do Supermercado Tejotão. Responde em português do Brasil, de forma direta e objetiva, para gestores de varejo.

Você NUNCA inventa números. Sempre que a pergunta envolver dados (vendas, produtos, lojas, margem, ticket, dias da semana, ruptura, estoque), use a ferramenta consultar_erp para buscar no banco do ERP e só então responda.$ins$,
  'deepseek/deepseek-chat',
  0.2,
  true,
  true
);

INSERT INTO public.ai_agente_skills (agente_id, titulo, conteudo, ordem, ativa)
SELECT a.id, s.titulo, s.conteudo, s.ordem, true
FROM public.ai_agentes a,
(VALUES
  ('Regras de negócio validadas', $s1$REGRAS DE NEGÓCIO JÁ VALIDADAS (use sempre):
- Movimentações de venda: mprd_dcto_tipo IN ('EVD','EVL','EVP') e mprd_status = 'N' (nunca 'C', que é cancelada).
- Quantidade vendida = SUM(mprd_qtde). Faturamento = SUM(mprd_valor).
- Custo do fechamento = SUM(coalesce(mprd_ctmedio,0) + coalesce(mprd_ctvenda,0)). Margem % = (faturamento - custo) / faturamento * 100.
- Data do movimento = mprd_datamvto. Loja/unidade = mprd_unid_codigo. Produto = mprd_prod_codigo.
- Cupons (clientes atendidos) só existem na base de cupom fiscal: {{fact_vdadet}}, com vdet_status = 'N', vdet_datamvto, vdet_unid_codigo, vdet_pdv, vdet_cupom. Ticket médio = faturamento / cupons.
- Estoque atual: tabela produn (prun_unid_codigo, prun_prod_codigo, prun_estoque1, prun_ctmedio, prun_prvenda, prun_bloqueado). Item não bloqueado (prun_bloqueado = 'N') significa que vendemos o item.
- Cadastro: produtos (prod_codigo, prod_descricao, prod_dpto_codigo, prod_forn_codigo), departamentos (dpto_codigo, dpto_descricao), fornecedores (forn_codigo, forn_nome).$s1$, 1),
  ('Mapa das tabelas de fato', $s2$TABELAS DE FATO: use SEMPRE os marcadores {{fact_movprodd}} (movimentações de produto) e {{fact_vdadet}} (cupom fiscal) no lugar do nome real da tabela. As demais tabelas (produn, produtos, departamentos, fornecedores) são usadas pelo nome normal.$s2$, 2),
  ('Como consultar o ERP', $s3$COMO CONSULTAR:
- Só SELECT (leitura). Sempre agregue e ordene, e limite o resultado (o retorno é truncado em 200 linhas).
- Sempre dê nomes claros às colunas (AS).
- Para análise por dia da semana use to_char(mprd_datamvto, 'ID') ou extract(dow from mprd_datamvto) e traduza o nome do dia na resposta.
- Se o usuário não disser o período, use os últimos 90 dias e diga isso na resposta.$s3$, 3),
  ('Formato da resposta', $s4$RESPOSTA: comece pelo número/conclusão, use tabela markdown quando houver ranking ou comparação, e finalize com um insight prático curto. Sempre informe o período considerado.$s4$, 4)
) AS s(titulo, conteudo, ordem)
WHERE a.slug = 'comercial';