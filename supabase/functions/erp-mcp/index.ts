import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MCP_URL = 'https://erp-connect.lovable.app/mcp'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(len = 48) {
  return b64url(crypto.getRandomValues(new Uint8Array(len)))
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return b64url(new Uint8Array(digest))
}

async function discover() {
  const res = await fetch('https://erp-connect.lovable.app/.well-known/oauth-protected-resource')
  if (!res.ok) throw new Error('Não foi possível localizar o servidor do ERP')
  const resource = await res.json()
  const issuer: string = resource.authorization_servers?.[0]
  if (!issuer) throw new Error('Servidor do ERP não informou o serviço de login')
  const metaRes = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/oauth-authorization-server`)
  if (!metaRes.ok) throw new Error('Não foi possível ler a configuração de login do ERP')
  return { issuer, meta: await metaRes.json() }
}

async function registerClient(meta: any, redirectUri: string) {
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Tejotao App',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Falha ao registrar o app no ERP [${res.status}]: ${body}`)
  return JSON.parse(body)
}

async function exchangeToken(meta: any, params: Record<string, string>) {
  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Falha ao obter autorização [${res.status}]: ${body}`)
  return JSON.parse(body)
}

async function mcpRpc(token: string, method: string, params: unknown) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ERP respondeu ${res.status}: ${text}`)
  if (text.startsWith('event:') || text.includes('\ndata: ')) {
    const line = text.split('\n').find((l) => l.startsWith('data: '))
    return line ? JSON.parse(line.slice(6)) : null
  }
  return JSON.parse(text)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return json({ error: 'Não autorizado' }, 401)

    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return json({ error: 'Apenas administradores' }, 403)

    const { action, redirectUri, code, state, toolName, toolArgs } = await req.json()

    const { data: conn } = await admin
      .from('erp_mcp_connection')
      .select('*')
      .eq('server_url', MCP_URL)
      .maybeSingle()

    if (action === 'status') {
      return json({
        connected: conn?.status === 'connected',
        status: conn?.status ?? 'disconnected',
        lastError: conn?.last_error ?? null,
        updatedAt: conn?.updated_at ?? null,
      })
    }

    if (action === 'disconnect') {
      if (conn) await admin.from('erp_mcp_connection').delete().eq('id', conn.id)
      return json({ ok: true })
    }

    if (action === 'start') {
      if (!redirectUri) return json({ error: 'redirectUri obrigatório' }, 400)
      const { issuer, meta } = await discover()
      let clientId = conn?.client_id
      let clientSecret = conn?.client_secret ?? null
      if (!clientId || conn?.redirect_uri !== redirectUri) {
        const reg = await registerClient(meta, redirectUri)
        clientId = reg.client_id
        clientSecret = reg.client_secret ?? null
      }
      const verifier = randomString()
      const challenge = await pkceChallenge(verifier)
      const st = randomString(24)

      const row = {
        owner_id: user.id,
        server_url: MCP_URL,
        issuer,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        state: st,
        status: 'authenticating',
        last_error: null,
        updated_at: new Date().toISOString(),
      }
      if (conn) await admin.from('erp_mcp_connection').update(row).eq('id', conn.id)
      else await admin.from('erp_mcp_connection').insert(row)

      const url = new URL(meta.authorization_endpoint)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', clientId!)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('state', st)
      url.searchParams.set('code_challenge', challenge)
      url.searchParams.set('code_challenge_method', 'S256')
      url.searchParams.set('scope', 'openid profile email')
      url.searchParams.set('resource', MCP_URL)
      return json({ authUrl: url.toString() })
    }

    if (action === 'callback') {
      if (!conn) return json({ error: 'Nenhuma conexão iniciada' }, 400)
      if (!code || state !== conn.state) return json({ error: 'Autorização inválida' }, 400)
      const { meta } = await discover()
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: conn.redirect_uri,
        client_id: conn.client_id,
        code_verifier: conn.code_verifier,
        resource: MCP_URL,
      }
      if (conn.client_secret) params.client_secret = conn.client_secret
      const tokens = await exchangeToken(meta, params)
      await admin.from('erp_mcp_connection').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        status: 'connected',
        state: null,
        code_verifier: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', conn.id)
      return json({ ok: true })
    }

    if (action === 'tools' || action === 'call') {
      if (!conn || conn.status !== 'connected') return json({ error: 'ERP não conectado' }, 400)
      let token = conn.access_token as string
      if (conn.expires_at && new Date(conn.expires_at).getTime() < Date.now() + 30000 && conn.refresh_token) {
        const { meta } = await discover()
        const params: Record<string, string> = {
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
          client_id: conn.client_id,
          resource: MCP_URL,
        }
        if (conn.client_secret) params.client_secret = conn.client_secret
        const tokens = await exchangeToken(meta, params)
        token = tokens.access_token
        await admin.from('erp_mcp_connection').update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? conn.refresh_token,
          expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', conn.id)
      }

      await mcpRpc(token, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'tejotao-app', version: '1.0.0' },
      })

      if (action === 'tools') {
        const result = await mcpRpc(token, 'tools/list', {})
        return json({ tools: result?.result?.tools ?? [] })
      }
      if (!toolName) return json({ error: 'toolName obrigatório' }, 400)
      const result = await mcpRpc(token, 'tools/call', { name: toolName, arguments: toolArgs ?? {} })
      return json({ result: result?.result ?? null, error: result?.error ?? null })
    }

    return json({ error: 'Ação desconhecida' }, 400)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('erp-mcp error:', message)
    return json({ error: message }, 500)
  }
})
