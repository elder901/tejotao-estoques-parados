-- ============ REGRAS DE NEGÓCIO (versionadas) ============
CREATE TABLE public.regras_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao integer NOT NULL,
  parametros jsonb NOT NULL,
  ativa boolean NOT NULL DEFAULT false,
  motivo text NOT NULL DEFAULT '',
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX regras_versoes_versao_key ON public.regras_versoes (versao);
CREATE UNIQUE INDEX regras_versoes_uma_ativa ON public.regras_versoes (ativa) WHERE ativa;

GRANT SELECT, INSERT, UPDATE ON public.regras_versoes TO authenticated;
GRANT ALL ON public.regras_versoes TO service_role;
ALTER TABLE public.regras_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler regras"
  ON public.regras_versoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem criar versoes de regra"
  ON public.regras_versoes FOR INSERT TO authenticated
  WITH CHECK (private.is_admin(auth.uid()) AND criado_por = auth.uid());
CREATE POLICY "Admins podem ativar versoes de regra"
  ON public.regras_versoes FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

-- ============ LOG DE SINCRONIZAÇÃO ============
CREATE TABLE public.erp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL DEFAULT 'executando',
  linhas integer NOT NULL DEFAULT 0,
  erro text,
  regra_versao integer,
  disparado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX erp_sync_log_iniciado_idx ON public.erp_sync_log (iniciado_em DESC);

GRANT SELECT ON public.erp_sync_log TO authenticated;
GRANT ALL ON public.erp_sync_log TO service_role;
ALTER TABLE public.erp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler o log de sync"
  ON public.erp_sync_log FOR SELECT TO authenticated USING (true);

-- ============ SNAPSHOT DE ESTOQUE CALCULADO ============
CREATE TABLE public.erp_estoque_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.erp_sync_log(id) ON DELETE CASCADE,
  cod_unidade text NOT NULL,
  cod_item text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  cod_departamento text NOT NULL DEFAULT '',
  departamento text NOT NULL DEFAULT '',
  fornecedor text NOT NULL DEFAULT '',
  quantidade_estoque numeric NOT NULL DEFAULT 0,
  custo_medio numeric NOT NULL DEFAULT 0,
  valor_estoque numeric NOT NULL DEFAULT 0,
  vendas_periodo numeric NOT NULL DEFAULT 0,
  dias_periodo integer NOT NULL DEFAULT 90,
  vmd numeric NOT NULL DEFAULT 0,
  dias_estoque numeric NOT NULL DEFAULT 0,
  sem_giro boolean NOT NULL DEFAULT false,
  regra_versao integer NOT NULL DEFAULT 1,
  data_referencia date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX erp_snapshot_item_unidade_key
  ON public.erp_estoque_snapshot (cod_unidade, cod_item);
CREATE INDEX erp_snapshot_valor_idx ON public.erp_estoque_snapshot (valor_estoque DESC);
CREATE INDEX erp_snapshot_dias_idx ON public.erp_estoque_snapshot (dias_estoque DESC);

GRANT SELECT ON public.erp_estoque_snapshot TO authenticated;
GRANT ALL ON public.erp_estoque_snapshot TO service_role;
ALTER TABLE public.erp_estoque_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler o snapshot"
  ON public.erp_estoque_snapshot FOR SELECT TO authenticated USING (true);

-- ============ VERSÃO INICIAL DAS REGRAS ============
INSERT INTO public.regras_versoes (versao, parametros, ativa, motivo)
VALUES (
  1,
  jsonb_build_object(
    'janela_dias', 90,
    'tipos_venda', jsonb_build_array('EVD','EVL','EVP'),
    'status_movimento', 'N',
    'faixas_dias', jsonb_build_array(
      jsonb_build_object('rotulo','0-30','min',0,'max',30),
      jsonb_build_object('rotulo','30-60','min',30,'max',60),
      jsonb_build_object('rotulo','60-90','min',60,'max',90),
      jsonb_build_object('rotulo','90-120','min',90,'max',120),
      jsonb_build_object('rotulo','120+','min',120,'max',null)
    ),
    'dias_criticos', 90,
    'tamanho_ranking', 50,
    'dias_sem_giro', 999,
    'somente_estoque_positivo', true
  ),
  true,
  'Versão inicial definida na migração para o ERP'
);