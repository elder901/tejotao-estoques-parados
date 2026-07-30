// Cliente compartilhado para falar com o MCP do ERP (erp-connect.lovable.app).
// Cuida da descoberta OAuth, refresh do token e das chamadas JSON-RPC.

export const MCP_URL = 'https://erp-connect.lovable.app/mcp'

export async function discover() {
  const res = await fetch('https://erp-connect.lovable.app/.well-known/oauth-protected-resource')
  if (!res.ok) throw new Error('Não foi possível localizar o servidor do ERP')
  const resource = await res.json()
  const issuer: string = resource.authorization_servers?.[0]
  if (!issuer) throw new Error('Servidor do ERP não informou o serviço de login')
  const metaRes = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/oauth-authorization-server`)
  if (!metaRes.ok) throw new Error('Não foi possível ler a configuração de login do ERP')
  return { issuer, meta: await metaRes.json() }
}

async function exchangeToken(meta: any, params: Record<string, string>) {
  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Falha ao renovar a autorização do ERP [${res.status}]: ${body}`)
  return JSON.parse(body)
}

/** Devolve um access token válido, renovando quando necessário. */
export async function getErpToken(admin: any): Promise<string> {
  const { data: conn } = await admin
    .from('erp_mcp_connection')
    .select('*')
    .eq('server_url', MCP_URL)
    .maybeSingle()

  if (!conn || conn.status !== 'connected') {
    throw new Error('ERP não conectado. Abra Administração → Conexão ERP e conecte novamente.')
  }

  const expiring = conn.expires_at && new Date(conn.expires_at).getTime() < Date.now() + 60_000
  if (!expiring || !conn.refresh_token) return conn.access_token as string

  const { meta } = await discover()
  const params: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: conn.refresh_token,
    client_id: conn.client_id,
    resource: MCP_URL,
  }
  if (conn.client_secret) params.client_secret = conn.client_secret
  const tokens = await exchangeToken(meta, params)
  await admin.from('erp_mcp_connection').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? conn.refresh_token,
    expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id)
  return tokens.access_token as string
}

export async function mcpRpc(token: string, method: string, params: unknown) {
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

export async function initializeMcp(token: string) {
  await mcpRpc(token, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'tejotao-app', version: '1.0.0' },
  })
}

/** Executa um SELECT somente-leitura no ERP e devolve as linhas. */
export async function runErpSql(token: string, query: string, purpose: string): Promise<any[]> {
  const rpc = await mcpRpc(token, 'tools/call', {
    name: 'run_erp_sql',
    arguments: { query, purpose },
  })
  if (rpc?.error) throw new Error(rpc.error.message ?? 'Erro ao consultar o ERP')
  const text = rpc?.result?.content?.[0]?.text
  if (!text) throw new Error('O ERP não devolveu dados')
  let payload: any
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`Resposta inesperada do ERP: ${String(text).slice(0, 300)}`)
  }
  if (payload?.ok === false || payload?.error) {
    throw new Error(payload.error ?? 'Consulta recusada pelo ERP')
  }
  if (typeof text === 'string' && text.startsWith('Erro:')) throw new Error(text)
  return payload.rows ?? []
}