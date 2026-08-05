CREATE TABLE public.erp_ruptura_totais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.erp_sync_log(id),
  cod_unidade text NOT NULL UNIQUE,
  itens_ativos integer NOT NULL DEFAULT 0,
  itens_zerados integer NOT NULL DEFAULT 0,
  itens_negativos integer NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.erp_ruptura_totais TO authenticated;
GRANT ALL ON public.erp_ruptura_totais TO service_role;

ALTER TABLE public.erp_ruptura_totais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler totais de ruptura"
ON public.erp_ruptura_totais FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_erp_ruptura_totais_updated_at
BEFORE UPDATE ON public.erp_ruptura_totais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();