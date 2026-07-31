CREATE TABLE public.erp_indicadores_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_unidade text NOT NULL,
  ano_mes text NOT NULL,
  faturamento numeric NOT NULL DEFAULT 0,
  custo numeric NOT NULL DEFAULT 0,
  itens numeric NOT NULL DEFAULT 0,
  cupons integer NOT NULL DEFAULT 0,
  dias integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cod_unidade, ano_mes)
);
GRANT SELECT ON public.erp_indicadores_mensal TO authenticated;
GRANT ALL ON public.erp_indicadores_mensal TO service_role;
ALTER TABLE public.erp_indicadores_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler indicadores mensais"
  ON public.erp_indicadores_mensal FOR SELECT TO authenticated USING (true);