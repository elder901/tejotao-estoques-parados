CREATE TABLE public.erp_ruptura_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid,
  cod_unidade text NOT NULL,
  cod_item text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  cod_departamento text NOT NULL DEFAULT '',
  departamento text NOT NULL DEFAULT '',
  fornecedor text NOT NULL DEFAULT '',
  quantidade_estoque numeric NOT NULL DEFAULT 0,
  custo_medio numeric NOT NULL DEFAULT 0,
  preco_venda numeric NOT NULL DEFAULT 0,
  vendas_periodo numeric NOT NULL DEFAULT 0,
  dias_periodo integer NOT NULL DEFAULT 90,
  vmd numeric NOT NULL DEFAULT 0,
  perda_dia numeric NOT NULL DEFAULT 0,
  regra_versao integer NOT NULL DEFAULT 1,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cod_unidade, cod_item)
);

GRANT SELECT ON public.erp_ruptura_snapshot TO authenticated;
GRANT ALL ON public.erp_ruptura_snapshot TO service_role;

ALTER TABLE public.erp_ruptura_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler a ruptura"
ON public.erp_ruptura_snapshot FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_ruptura_unidade ON public.erp_ruptura_snapshot (cod_unidade);
CREATE INDEX idx_ruptura_perda ON public.erp_ruptura_snapshot (perda_dia DESC);