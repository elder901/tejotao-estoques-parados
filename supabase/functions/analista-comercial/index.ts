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

const MODELO_PADRAO = 'deepseek/deepseek-chat'
const MAX_LINHAS = 200
const MAX_PASSOS = 6

const SYSTEM = `Você é o Analista Comercial do Supermercado Tejotão. Responde em português do Brasil, de forma direta e objetiva, para gestores de varejo.

Você NUNCA inventa números. Sempre que a pergunta envolver dados (vendas, produtos, lojas, margem, ticket, dias da semana, ruptura, estoque), use a ferramenta consultar_erp para buscar no banco do ERP e só então responda.

REGRAS DE NEGÓCIO JÁ VALIDADAS (use sempre):
- Movimentações de venda: mprd_dcto_tipo IN ('EVD','EVL','EVP') e mprd_status = 'N' (nunca 'C', que é cancelada).
- Quantidade vendida = SUM(mprd_qtde). Faturamento = SUM(mprd_valor).
- Custo do fechamento = SUM(coalesce(mprd_ctmedio,0) + coalesce(mprd_ctvenda,0)). Margem % = (faturamento - custo) / faturamento * 100.
- Data do movimento = mprd_datamvto. Loja/unidade = mprd_unid_codigo. Produto = mprd_prod_codigo.
- Cupons (clientes atendidos) só existem na base de cupom fiscal: {{fact_vdadet}}, com vdet_status = 'N', vdet_datamvto, vdet_unid_codigo, vdet_pdv, vdet_cupom. Ticket médio = faturamento / cupons.
- Estoque atual: tabela produn (prun_unid_codigo, prun_prod_codigo, prun_estoque1, prun_ctmedio, prun_prvenda, prun_bloqueado). Item não bloqueado (prun_bloqueado = 'N') significa que vendemos o item.
- Cadastro: produtos (prod_codigo, prod_descricao, prod_dpto_codigo, prod_forn_codigo), departamentos (dpto_codigo, dpto_descricao), fornecedores (forn_codigo, forn_nome).

TABELAS DE FATO: use SEMPRE os marcadores {{fact_movprodd}} (movimentações de produto) e {{fact_vdadet}} (cupom fiscal) no lugar do nome real da tabela. As demais tabelas (produn, produtos, departamentos, fornecedores) são usadas pelo nome normal.

COMO CONSULTAR:
- Só SELECT (leitura). Sempre agregue e ordene, e limite o resultado (o retorno é truncado em ${MAX_LINHAS} linhas).
- Sempre dê nomes claros às colunas (AS).
- Para análise por dia da semana use to_char(mprd_datamvto, 'ID') ou extract(dow from mprd_datamvto) e traduza o nome do dia na resposta.
- Se o usuário não disser o período, use os últimos 90 dias e diga isso na resposta.

RESPOSTA: comece pelo número/conclusão, use tabela markdown quando houver ranking ou comparação, e finalize com um insight prático curto. Sempre informe o período considerado.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultar_erp',
      description: 'Executa uma consulta SELECT somente-leitura no banco do ERP e devolve as linhas em JSON.',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'A consulta SELECT, usando os marcadores {{fact_movprodd}} e {{fact_vdadet}}.' },
          motivo: { type: 'string', description: 'Uma frase curta explicando o que a consulta busca.' },
        },
        required: ['sql', 'motivo'],
      },
    },
  },
]

const PROIBIDO = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|vacuum|call|do)\b/i

function validarSql(sql: string) {
  const limpo = sql.trim().replace(/;+\s*$/, '')
  if (!/^(select|with)\b/i.test(limpo)) throw new Error('Somente consultas SELECT são permitidas.')
  if (limpo.includes(';')) throw new Error('Envie apenas uma consulta por vez.')
  if (PROIBIDO.test(limpo)) throw new Error('Comandos de escrita não são permitidos.')
  return limpo
}

function empacotar(sql: string) {
  return `SELECT json_agg(row_to_json(x))::text AS pacote FROM (SELECT * FROM (${sql}) q LIMIT ${MAX_LINHAS}) x`
}

async function executarConsulta(admin: any, sql: string, motivo: string) {
  const limpo = validarSql(sql)
  const token = await getErpToken(admin)
  await initializeMcp(token)
  const rows = await runErpSql(token, empacotar(limpo), motivo || 'Consulta do Analista Comercial')
  const texto = rows?.[0]?.pacote
  const dados = texto ? JSON.parse(texto) : []
  return { sql: limpo, linhas: dados.length, dados }
}

type Config = { instrucoes: string; modelo: string; temperatura: number; permite_erp: boolean }

async function carregarConfig(admin: any): Promise<Config> {
  try {
    const { data: agente } = await admin
      .from('ai_agentes')
      .select('id, instrucoes, modelo, temperatura, permite_erp, ativo')
      .eq('slug', 'comercial')
      .maybeSingle()
    if (!agente) return { instrucoes: SYSTEM, modelo: MODELO_PADRAO, temperatura: 0.2, permite_erp: true }
    const { data: skills } = await admin
      .from('ai_agente_skills')
      .select('titulo, conteudo, ordem')
      .eq('agente_id', agente.id)
      .eq('ativa', true)
      .order('ordem', { ascending: true })
    return montarConfig(agente, skills ?? [])
  } catch (_e) {
    return { instrucoes: SYSTEM, modelo: MODELO_PADRAO, temperatura: 0.2, permite_erp: true }
  }
}

function montarConfig(agente: any, skills: any[]): Config {
  const blocos = (skills ?? []).map((s: any) => String(s.conteudo ?? '').trim()).filter(Boolean)
  const base = String(agente?.instrucoes ?? '').trim() || SYSTEM
  return {
    instrucoes: [base, ...blocos].join('\n\n'),
    modelo: String(agente?.modelo ?? '').trim() || MODELO_PADRAO,
    temperatura: Number.isFinite(Number(agente?.temperatura)) ? Number(agente.temperatura) : 0.2,
    permite_erp: agente?.permite_erp !== false,
  }
}

async function chamarModelo(apiKey: string, messages: any[], cfg: Config) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://eficienciaoperacional.supertejotao.com.br',
      'X-Title': 'Tejotao Analistas de IA',
    },
    body: JSON.stringify({
      model: cfg.modelo,
      messages,
      ...(cfg.permite_erp ? { tools: TOOLS } : {}),
      temperature: cfg.temperatura,
    }),
  })
  const texto = await res.text()
  if (!res.ok) {
    if (res.status === 402) throw new Error('Sem créditos na OpenRouter. Adicione saldo na sua conta para continuar.')
    if (res.status === 429) throw new Error('Muitas perguntas em sequência. Aguarde alguns segundos e tente de novo.')
    if (res.status === 401) throw new Error('A chave da OpenRouter é inválida ou foi revogada.')
    throw new Error(`Erro da OpenRouter [${res.status}]: ${texto.slice(0, 300)}`)
  }
  return JSON.parse(texto)
}

async function conversar(admin: any, apiKey: string, cfg: Config, turnos: any[]) {
  const messages: any[] = [{ role: 'system', content: cfg.instrucoes }, ...turnos]
  const consultas: { sql: string; motivo: string; linhas: number; erro?: string }[] = []
  let resposta = ''

  for (let passo = 0; passo < MAX_PASSOS; passo++) {
    const data = await chamarModelo(apiKey, messages, cfg)
    const msg = data?.choices?.[0]?.message
    if (!msg) throw new Error('O modelo não devolveu resposta.')
    messages.push(msg)

    const calls = msg.tool_calls ?? []
    if (!calls.length) {
      resposta = String(msg.content ?? '').trim()
      break
    }

    for (const call of calls) {
      let args: any = {}
      try { args = JSON.parse(call.function?.arguments ?? '{}') } catch { /* ignora */ }
      try {
        const r = await executarConsulta(admin, String(args.sql ?? ''), String(args.motivo ?? ''))
        consultas.push({ sql: r.sql, motivo: String(args.motivo ?? ''), linhas: r.linhas })
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ linhas: r.linhas, dados: r.dados }).slice(0, 60000),
        })
      } catch (e) {
        const erro = e instanceof Error ? e.message : String(e)
        consultas.push({ sql: String(args.sql ?? ''), motivo: String(args.motivo ?? ''), linhas: 0, erro })
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ erro }) })
      }
    }
  }

  if (!resposta) resposta = 'Não consegui concluir a análise. Tente reformular a pergunta ou reduzir o período.'
  return { resposta, consultas }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) return json({ error: 'A chave da OpenRouter não está configurada.' }, 500)

    const authHeader = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)
    const { data: { user } } = await admin.auth.getUser(authHeader)
    if (!user) return json({ error: 'Não autorizado' }, 401)

    const body = await req.json()
    const previa = body?.previa === true
    const threadId = String(body?.threadId ?? '')
    const pergunta = String(body?.pergunta ?? '').trim()
    if (previa) {
      if (!pergunta) return json({ error: 'Escreva uma pergunta para testar.' }, 400)
      const { data: perfil } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!perfil?.is_admin) return json({ error: 'Somente administradores podem testar agentes.' }, 403)
      const cfgPrev = montarConfig(body?.agente ?? {}, body?.skills ?? [])
      const r = await conversar(admin, apiKey, cfgPrev, [{ role: 'user', content: pergunta }])
      return json(r)
    }

    if (!threadId || !pergunta) return json({ error: 'Pergunta ou conversa inválida.' }, 400)

    const { data: thread } = await admin
      .from('ai_threads')
      .select('id, user_id, titulo')
      .eq('id', threadId)
      .maybeSingle()
    if (!thread || thread.user_id !== user.id) return json({ error: 'Conversa não encontrada.' }, 404)

    const { data: historico } = await admin
      .from('ai_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(30)

    await admin.from('ai_messages').insert({
      thread_id: threadId, user_id: user.id, role: 'user', content: pergunta,
    })
    if (!historico?.length) {
      await admin.from('ai_threads').update({ titulo: pergunta.slice(0, 60) }).eq('id', threadId)
    } else {
      await admin.from('ai_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
    }

    const cfg = await carregarConfig(admin)
    const { resposta, consultas } = await conversar(admin, apiKey, cfg, [
      ...(historico ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: pergunta },
    ])

    const { data: salva } = await admin
      .from('ai_messages')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: 'assistant',
        content: resposta,
        parts: consultas,
      })
      .select('id, created_at')
      .single()

    await admin.from('ai_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

    return json({ resposta, consultas, id: salva?.id })
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e)
    console.error('[analista-comercial]', erro)
    return json({ error: erro }, 500)
  }
})
