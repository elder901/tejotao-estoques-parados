import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getErpToken, initializeMcp, runErpSql } from '../_shared/erpMcp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Agrega vendas (cupom fiscal) por unidade + mês dentro do intervalo. */
function sqlIndicadores(inicio: string, fim: string) {
  return (
    'SELECT json_agg(json_build_array(x.unid,x.mes,x.fat,x.custo,x.itens,x.dias))::text AS pacote FROM (' +
    "SELECT mprd_unid_codigo AS unid, to_char(mprd_datamvto, 'YYYY-MM') AS mes, " +
    'round(sum(mprd_valor)::numeric,2) AS fat, ' +
    'round(sum(coalesce(mprd_ctmedio,0))::numeric,2) AS custo, ' +
    'round(sum(mprd_qtde)::numeric,3) AS itens, ' +
    'count(DISTINCT mprd_datamvto) AS dias ' +
    "FROM fact_movprodd WHERE mprd_status = 'N' AND mprd_dcto_tipo IN ('EVD','EVL','EVP') " +
    `AND mprd_datamvto >= date '${inicio}' AND mprd_datamvto < date '${fim}' GROUP BY 1,2) x`
  )
}

/** Cupons (clientes atendidos) por unidade + mês — só existe na base de cupom fiscal. */
function sqlCupons(inicio: string, fim: string) {
  return (
    'SELECT json_agg(json_build_array(x.unid,x.mes,x.cupons))::text AS pacote FROM (' +
    "SELECT vdet_unid_codigo AS unid, to_char(vdet_datamvto, 'YYYY-MM') AS mes, " +
    'count(DISTINCT (vdet_datamvto::text || vdet_pdv || vdet_cupom)) AS cupons ' +
    "FROM fact_vdadet WHERE vdet_status = 'N' " +
    `AND vdet_datamvto >= date '${inicio}' AND vdet_datamvto < date '${fim}' GROUP BY 1,2) x`
  )
}

function desempacotar(rows: any[]): any[][] {
  const texto = rows?.[0]?.pacote
  return texto ? JSON.parse(texto) : []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  try {
    const authHeader = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const cronSecret = Deno.env.get('ERP_SYNC_CRON_SECRET')
    const cronHeader = req.headers.get('x-cron-secret')

    if ((cronSecret && cronHeader === cronSecret) || (authHeader && authHeader === serviceKey)) {
      // chamada agendada
    } else {
      if (!authHeader) return json({ error: 'Não autorizado' }, 401)
      const { data: { user } } = await admin.auth.getUser(authHeader)
      if (!user) return json({ error: 'Não autorizado' }, 401)
      const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) return json({ error: 'Apenas administradores' }, 403)
    }

    let anos: number[] = []
    try {
      const corpo = await req.json()
      if (Array.isArray(corpo?.anos)) anos = corpo.anos.map(Number).filter(Boolean)
    } catch { /* sem corpo */ }
    if (!anos.length) {
      const atual = new Date().getUTCFullYear()
      anos = [atual - 1, atual]
    }

    const token = await getErpToken(admin)
    await initializeMcp(token)

    const hoje = new Date()
    const linhas: any[] = []
    for (const ano of anos) {
      for (let mes = 1; mes <= 12; mes++) {
        const inicioDate = new Date(Date.UTC(ano, mes - 1, 1))
        if (inicioDate > hoje) break
        const inicio = inicioDate.toISOString().slice(0, 10)
        const fim = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10)
        const pacote = desempacotar(
          await runErpSql(token, sqlIndicadores(inicio, fim), `Indicadores mensais ${inicio}`),
        )
        if (!pacote.length) continue
        const cuponsMap = new Map<string, number>()
        try {
          for (const [unid, m, cupons] of desempacotar(
            await runErpSql(token, sqlCupons(inicio, fim), `Cupons ${inicio}`),
          )) {
            cuponsMap.set(`${String(unid).trim()}|${m}`, Number(cupons) || 0)
          }
        } catch { /* base de cupom pode não ter o período */ }
        for (const [unid, m, fat, custo, itens, dias] of pacote) {
          linhas.push({
            cod_unidade: String(unid ?? '').trim(),
            ano_mes: String(m),
            faturamento: Number(fat) || 0,
            custo: Number(custo) || 0,
            itens: Number(itens) || 0,
            cupons: cuponsMap.get(`${String(unid).trim()}|${m}`) ?? 0,
            dias: Number(dias) || 0,
            atualizado_em: new Date().toISOString(),
          })
        }
      }
    }

    if (linhas.length) {
      const { error } = await admin
        .from('erp_indicadores_mensal')
        .upsert(linhas, { onConflict: 'cod_unidade,ano_mes' })
      if (error) throw new Error(`Falha ao gravar indicadores: ${error.message}`)
    }

    return json({ ok: true, anos, linhas: linhas.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('erp-indicadores error:', message)
    return json({ error: message }, 500)
  }
})
