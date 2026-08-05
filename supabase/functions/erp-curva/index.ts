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

/**
 * Faixas da curva conforme o modelo oficial (planilha de Curva ABC):
 * classificação pelo percentual ACUMULADO de venda dentro de cada
 * estrutura (nível 2 / departamento).
 */
export const FAIXAS: { curva: string; ate: number }[] = [
  { curva: 'A1', ate: 0.25 },
  { curva: 'A2', ate: 0.45 },
  { curva: 'A3', ate: 0.50 },
  { curva: 'B1', ate: 0.70 },
  { curva: 'B2', ate: 0.85 },
  { curva: 'B3', ate: 0.90 },
  { curva: 'C1', ate: 0.95 },
  { curva: 'C2', ate: 0.98 },
  { curva: 'C3', ate: 1.01 },
]

export function classificar(acumulado: number): string {
  for (const f of FAIXAS) if (acumulado <= f.ate) return f.curva
  return 'C3'
}

/** Vendas por unidade + item no período (D-1), com departamento e descrição. */
export function sqlVendasValor(janela: number, pagina: number, tamanho: number) {
  return (
    'SELECT json_agg(json_build_array(x.unid,x.cod,x.descricao,x.dpto,x.dpto_nome,x.fornecedor,x.valor,x.qtde))::text AS pacote FROM (' +
    'SELECT m.mprd_unid_codigo AS unid, m.mprd_prod_codigo AS cod, ' +
    'max(pr.prod_descricao) AS descricao, max(pr.prod_dpto_codigo) AS dpto, ' +
    'max(d.dpto_descricao) AS dpto_nome, max(f.forn_nome) AS fornecedor, ' +
    'round(sum(m.mprd_valor)::numeric,2) AS valor, round(sum(m.mprd_qtde)::numeric,3) AS qtde ' +
    'FROM {{fact_movprodd}} m ' +
    'JOIN produtos pr ON pr.prod_codigo = m.mprd_prod_codigo ' +
    'LEFT JOIN departamentos d ON d.dpto_codigo = pr.prod_dpto_codigo ' +
    'LEFT JOIN fornecedores f ON f.forn_codigo = pr.prod_forn_codigo ' +
    "WHERE m.mprd_status = 'N' AND m.mprd_dcto_tipo IN ('EVD','EVL','EVP') " +
    `AND m.mprd_datamvto >= current_date - ${janela} AND m.mprd_datamvto < current_date ` +
    'GROUP BY 1,2 HAVING sum(m.mprd_valor) > 0 ' +
    `ORDER BY 7 DESC LIMIT ${tamanho} OFFSET ${pagina * tamanho}) x`
  )
}

function desempacotar(rows: any[]): any[][] {
  const texto = rows?.[0]?.pacote
  return texto ? JSON.parse(texto) : []
}

export interface ItemVenda {
  cod_unidade: string
  cod_item: string
  descricao: string
  cod_departamento: string
  departamento: string
  fornecedor: string
  valor_venda: number
  quantidade_venda: number
}

/**
 * Classifica os itens em A1..C3 dentro de cada grupo (unidade + departamento),
 * ordenando por valor de venda e acumulando a participação.
 */
export function calcularCurvas(itens: ItemVenda[], diasPeriodo: number, dataRef: string) {
  const grupos = new Map<string, ItemVenda[]>()
  for (const item of itens) {
    const chave = `${item.cod_unidade}|${item.cod_departamento}`
    const lista = grupos.get(chave)
    if (lista) lista.push(item)
    else grupos.set(chave, [item])
  }

  const saida: any[] = []
  for (const lista of grupos.values()) {
    const total = lista.reduce((s, i) => s + i.valor_venda, 0)
    if (total <= 0) continue
    lista.sort((a, b) => b.valor_venda - a.valor_venda)
    let acumulado = 0
    lista.forEach((item, indice) => {
      const participacao = item.valor_venda / total
      acumulado += participacao
      saida.push({
        ...item,
        participacao: Number(participacao.toFixed(8)),
        participacao_acumulada: Number(Math.min(acumulado, 1).toFixed(8)),
        curva: classificar(Math.min(acumulado, 1)),
        posicao: indice + 1,
        dias_periodo: diasPeriodo,
        data_referencia: dataRef,
      })
    })
  }
  return saida
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
      if (!user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401)
      const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) return json({ error: 'Apenas administradores' }, 403)
    }

    let janela = 90
    try {
      const corpo = await req.json()
      if (Number(corpo?.janela)) janela = Math.min(365, Math.max(7, Math.floor(Number(corpo.janela))))
    } catch { /* sem corpo */ }

    const token = await getErpToken(admin)
    await initializeMcp(token)

    const TAM = 15000
    const brutos: any[][] = []
    for (let pagina = 0; pagina < 10; pagina++) {
      const pacote = desempacotar(
        await runErpSql(token, sqlVendasValor(janela, pagina, TAM), `Curva ABC — vendas (página ${pagina + 1})`),
      )
      brutos.push(...pacote)
      if (pacote.length < TAM) break
    }

    const porLoja: ItemVenda[] = brutos
      .map(([unid, cod, descricao, dpto, dptoNome, fornecedor, valor, qtde]) => ({
        cod_unidade: String(unid ?? '').trim(),
        cod_item: String(cod ?? '').trim(),
        descricao: String(descricao ?? '').trim(),
        cod_departamento: String(dpto ?? '').trim(),
        departamento: String(dptoNome ?? '').trim() || 'Sem departamento',
        fornecedor: String(fornecedor ?? '').trim(),
        valor_venda: Number(valor) || 0,
        quantidade_venda: Number(qtde) || 0,
      }))
      .filter((i) => i.cod_unidade && i.cod_item)

    // Visão rede: mesma regra, somando as lojas
    const redeMap = new Map<string, ItemVenda>()
    for (const item of porLoja) {
      const existente = redeMap.get(item.cod_item)
      if (existente) {
        existente.valor_venda += item.valor_venda
        existente.quantidade_venda += item.quantidade_venda
      } else {
        redeMap.set(item.cod_item, { ...item, cod_unidade: 'REDE' })
      }
    }

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const linhas = [
      ...calcularCurvas(porLoja, janela, ontem),
      ...calcularCurvas([...redeMap.values()], janela, ontem),
    ]

    await admin.from('erp_curva_abc').delete().neq('cod_item', '__nenhum__')

    const CHUNK = 1000
    for (let i = 0; i < linhas.length; i += CHUNK) {
      const { error } = await admin.from('erp_curva_abc').insert(linhas.slice(i, i + CHUNK))
      if (error) throw new Error(`Falha ao gravar a curva: ${error.message}`)
    }

    return json({ ok: true, itens: linhas.length, janela, data_referencia: ontem })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('erp-curva error:', message)
    return json({ error: message }, 500)
  }
})