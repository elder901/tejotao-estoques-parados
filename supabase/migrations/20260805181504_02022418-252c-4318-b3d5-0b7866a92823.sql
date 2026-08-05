CREATE TABLE public.erp_curva_abc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.erp_sync_log(id),
  cod_unidade text NOT NULL,
  cod_item text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  cod_departamento text NOT NULL DEFAULT '',
  departamento text NOT NULL DEFAULT '',
  fornecedor text NOT NULL DEFAULT '',
  valor_venda numeric NOT NULL DEFAULT 0,
  quantidade_venda numeric NOT NULL DEFAULT 0,
  participacao numeric NOT NULL DEFAULT 0,
  participacao_acumulada numeric NOT NULL DEFAULT 0,
  curva text NOT NULL DEFAULT 'C3',
  posicao integer NOT NULL DEFAULT 0,
  dias_periodo integer NOT NULL DEFAULT 90,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cod_unidade, cod_item)
);

CREATE INDEX idx_curva_abc_unidade ON public.erp_curva_abc (cod_unidade);
CREATE INDEX idx_curva_abc_curva ON public.erp_curva_abc (curva);
CREATE INDEX idx_curva_abc_valor ON public.erp_curva_abc (valor_venda DESC);

GRANT SELECT ON public.erp_curva_abc TO authenticated;
GRANT ALL ON public.erp_curva_abc TO service_role;
ALTER TABLE public.erp_curva_abc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler a curva ABC"
  ON public.erp_curva_abc FOR SELECT TO authenticated USING (true);

CREATE TABLE public.erp_ruptura_totais_detalhe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.erp_sync_log(id),
  cod_unidade text NOT NULL,
  cod_departamento text NOT NULL DEFAULT '',
  departamento text NOT NULL DEFAULT '',
  itens_ativos integer NOT NULL DEFAULT 0,
  itens_zerados integer NOT NULL DEFAULT 0,
  itens_negativos integer NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cod_unidade, cod_departamento)
);

GRANT SELECT ON public.erp_ruptura_totais_detalhe TO authenticated;
GRANT ALL ON public.erp_ruptura_totais_detalhe TO service_role;
ALTER TABLE public.erp_ruptura_totais_detalhe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler totais por departamento"
  ON public.erp_ruptura_totais_detalhe FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_erp_ruptura_totais_detalhe_updated_at
  BEFORE UPDATE ON public.erp_ruptura_totais_detalhe
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();