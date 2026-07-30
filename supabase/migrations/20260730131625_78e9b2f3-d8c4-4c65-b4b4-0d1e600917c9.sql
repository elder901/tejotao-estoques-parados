CREATE TABLE public.erp_mcp_connection (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  server_url text NOT NULL,
  issuer text,
  client_id text,
  client_secret text,
  redirect_uri text,
  code_verifier text,
  state text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.erp_mcp_connection TO service_role;

ALTER TABLE public.erp_mcp_connection ENABLE ROW LEVEL SECURITY;