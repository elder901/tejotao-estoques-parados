CREATE TABLE public.ai_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  area text NOT NULL DEFAULT 'comercial',
  definicao text NOT NULL DEFAULT '',
  regra_tecnica text NOT NULL DEFAULT '',
  ativa boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_metricas TO authenticated;
GRANT ALL ON public.ai_metricas TO service_role;
ALTER TABLE public.ai_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler metricas" ON public.ai_metricas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar metricas" ON public.ai_metricas FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem editar metricas" ON public.ai_metricas FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem excluir metricas" ON public.ai_metricas FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));
CREATE TRIGGER update_ai_metricas_updated_at BEFORE UPDATE ON public.ai_metricas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_agente_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid NOT NULL REFERENCES public.ai_agentes(id) ON DELETE CASCADE,
  metrica_id uuid NOT NULL REFERENCES public.ai_metricas(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agente_id, metrica_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agente_metricas TO authenticated;
GRANT ALL ON public.ai_agente_metricas TO service_role;
ALTER TABLE public.ai_agente_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler vinculos de metricas" ON public.ai_agente_metricas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar vinculos de metricas" ON public.ai_agente_metricas FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem editar vinculos de metricas" ON public.ai_agente_metricas FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "Admins podem excluir vinculos de metricas" ON public.ai_agente_metricas FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));

CREATE TABLE public.ai_metrica_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metrica_id uuid NOT NULL REFERENCES public.ai_metricas(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  motivo text NOT NULL DEFAULT '',
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_metrica_versoes TO authenticated;
GRANT ALL ON public.ai_metrica_versoes TO service_role;
ALTER TABLE public.ai_metrica_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ler versoes de metrica" ON public.ai_metrica_versoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar versoes de metrica" ON public.ai_metrica_versoes FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()) AND criado_por = auth.uid());