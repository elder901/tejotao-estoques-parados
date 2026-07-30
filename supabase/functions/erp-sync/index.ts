import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getErpToken, initializeMcp, runErpSql } from '../_shared/erpMcp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export interface RegraParams {
  janela_dias: number
  tipos_venda: string[]
  status_movimento: string
  dias_criticos: number
  tamanho_ranking: number
  dias_sem_giro: number
  somente_estoque_positivo: boolean
  limite_linhas?: number
  faixas_dias?: { rotulo: string; min: number; max: number | null }[]
}

// O ERP corta a resposta em 200 linhas por consulta, então empacotamos o
// resultado em UMA linha JSON (json_agg) e desempacotamos aqui.

function limparParams(p: RegraParams) {
  return {
    tipos: (p.tipos_venda ?? ['EVD', 'EVL', 'EVP'])
      .map((t) => `'${String(t).replace(/[^A-Za-z0-9_]/g, '')}'`)
      .join(','),
    janela: Math.max(1, Math.floor(Number(p.janela_dias) || 90)),
    status: String(p.status_movimento ?? 'N').replace(/[^A-Za-z]/g, '') || 'N',
    limite: Math.min(60000, Math.max(100, Math.floor(Number(p.limite_linhas) || 25000))),
    somentePositivo: p.somente_estoque_positivo !== false,
  }
}

/** SQL das vendas do período, agregadas por unidade + item. */
export function sqlVendas(p: RegraParams) {
  const { tipos, janela, status } = limparParams(p)
  return (
    'SELECT json_agg(json_build_array(x.unid, x.cod, x.vendas))::text AS pacote FROM (' +
    'SELECT m.mprd_unid_codigo AS unid, m.mprd_prod_codigo AS cod, SUM(m.mprd_qtde) AS vendas ' +
    'FROM public.fact_movprodd m ' +
    `WHERE m.mprd_dcto_tipo IN (${tipos}) AND m.mprd_status = '${status}' ` +
    `AND m.mprd_datamvto >= current_date - ${janela} GROUP BY 1,2) x`
  )
}

/** SQL do estoque atual + dimensões, paginado por valor de estoque. */
export function sqlEstoque(p: RegraParams, pagina: number, tamanho: number) {
  const { somentePositivo } = limparParams(p)
  const filtro = somentePositivo ? 'WHERE pu.prun_estoque1 > 0 ' : ''
  return (
    'SELECT json_agg(json_build_array(x.unid, x.cod, x.descricao, x.dpto, x.dpto_nome, x.fornecedor, x.est, x.ctm))::text AS pacote FROM (' +
    'SELECT pu.prun_unid_codigo AS unid, pu.prun_prod_codigo AS cod, ' +
    'pr.prod_descricao AS descricao, pr.prod_dpto_codigo AS dpto, ' +
    'd.dpto_descricao AS dpto_nome, f.forn_nome AS fornecedor, ' +
    'pu.prun_estoque1 AS est, pu.prun_ctmedio AS ctm ' +
    'FROM produn pu ' +
    'JOIN produtos pr ON pr.prod_codigo = pu.prun_prod_codigo ' +
    'LEFT JOIN departamentos d ON d.dpto_codigo = pr.prod_dpto_codigo ' +
    'LEFT JOIN fornecedores f ON f.forn_codigo = pu.prun_forn_codigo ' +
    filtro +
    `ORDER BY pu.prun_estoque1 * pu.prun_ctmedio DESC LIMIT ${tamanho} OFFSET ${pagina * tamanho}) x`
  )
}

function desempacotar(rows: any[]): any[][] {
  const texto = rows?.[0]?.pacote
  if (!texto) return []
  return JSON.parse(texto)
}

/** Aplica a regra de giro sobre uma linha bruta do ERP. */
export function calcularLinha(row: any, p: RegraParams, versao: number, syncId: string) {
  const janela = Math.max(1, Math.floor(Number(p.janela_dias) || 90))
  const estoque = Number(row.est) || 0
  const custo = Number(row.ctm) || 0
  const vendas = Number(row.vendas) || 0
  const vmd = vendas / janela
  const semGiro = vmd <= 0
  const dias = semGiro ? Number(p.dias_sem_giro ?? 999) : estoque / vmd
  return {
    sync_id: syncId,
    cod_unidade: String(row.unid ?? '').trim(),
    cod_item: String(row.cod ?? '').trim(),
    descricao: String(row.descricao ?? '').trim(),
    cod_departamento: String(row.dpto ?? '').trim(),
    departamento: String(row.dpto_nome ?? '').trim(),
    fornecedor: String(row.fornecedor ?? '').trim(),
    quantidade_estoque: estoque,
    custo_medio: custo,
    valor_estoque: Number(row.valor_est) || estoque * custo,
    vendas_periodo: vendas,
    dias_periodo: janela,
    vmd: Number(vmd.toFixed(6)),
    dias_estoque: Number(Math.min(dias, 99999).toFixed(2)),
    sem_giro: semGiro,
    regra_versao: versao,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  let syncId: string | null = null

  try {
    const authHeader = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    let disparadoPor: string | null = null

    if (authHeader && authHeader === serviceKey) {
      // chamada agendada (cron)
    } else {
      if (!authHeader) return json({ error: 'Não autorizado' }, 401)
      const { data: { user } } = await admin.auth.getUser(authHeader)
      if (!user) return json({ error: 'Não autorizado' }, 401)
      const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) return json({ error: 'Apenas administradores' }, 403)
      disparadoPor = user.id
    }

    const { data: regra, error: regraErr } = await admin
      .from('regras_versoes')
      .select('versao, parametros')
      .eq('ativa', true)
      .single()
    if (regraErr || !regra) throw new Error('Nenhuma versão de regra ativa encontrada')
    const params = regra.parametros as RegraParams

    const { data: log, error: logErr } = await admin
      .from('erp_sync_log')
      .insert({ status: 'executando', regra_versao: regra.versao, disparado_por: disparadoPor })
      .select('id')
      .single()
    if (logErr) throw new Error(logErr.message)
    syncId = log.id

    const token = await getErpToken(admin)
    await initializeMcp(token)
    const rows = await runErpSql(
      token,
      montarSql(params),
      `Snapshot de estoque parado (regra v${regra.versao})`,
    )

    const calculadas = rows
      .map((r) => calcularLinha(r, params, regra.versao, syncId!))
      .filter((r) => r.cod_item && r.cod_unidade)

    // Substitui o snapshot anterior por completo
    await admin.from('erp_estoque_snapshot').delete().neq('cod_item', '__nenhum__')

    const CHUNK = 500
    for (let i = 0; i < calculadas.length; i += CHUNK) {
      const { error } = await admin
        .from('erp_estoque_snapshot')
        .upsert(calculadas.slice(i, i + CHUNK), { onConflict: 'cod_unidade,cod_item' })
      if (error) throw new Error(`Falha ao gravar snapshot: ${error.message}`)
    }

    await admin.from('erp_sync_log').update({
      status: 'concluido',
      linhas: calculadas.length,
      finalizado_em: new Date().toISOString(),
    }).eq('id', syncId)

    return json({ ok: true, linhas: calculadas.length, regra_versao: regra.versao, sync_id: syncId })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('erp-sync error:', message)
    if (syncId) {
      await admin.from('erp_sync_log').update({
        status: 'erro',
        erro: message,
        finalizado_em: new Date().toISOString(),
      }).eq('id', syncId)
    }
    return json({ error: message }, 500)
  }
})