CREATE OR REPLACE FUNCTION public.curva_abc_resumo(p_unidade text DEFAULT 'REDE', p_departamento text DEFAULT NULL)
RETURNS TABLE (curva text, itens bigint, valor numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.curva, count(*)::bigint, coalesce(sum(c.valor_venda), 0)
  FROM public.erp_curva_abc c
  WHERE c.cod_unidade = p_unidade
    AND (p_departamento IS NULL OR c.departamento = p_departamento)
  GROUP BY c.curva
  ORDER BY c.curva
$$;

GRANT EXECUTE ON FUNCTION public.curva_abc_resumo(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.curva_abc_departamentos(p_unidade text DEFAULT 'REDE')
RETURNS TABLE (departamento text, itens bigint, valor numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.departamento, count(*)::bigint, coalesce(sum(c.valor_venda), 0)
  FROM public.erp_curva_abc c
  WHERE c.cod_unidade = p_unidade
  GROUP BY c.departamento
  ORDER BY 3 DESC
$$;

GRANT EXECUTE ON FUNCTION public.curva_abc_departamentos(text) TO authenticated;