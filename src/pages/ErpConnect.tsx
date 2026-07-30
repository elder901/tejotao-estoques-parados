import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlugZap, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';

interface McpTool {
  name: string;
  title?: string;
  description?: string;
}

const ErpConnect = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<string>('carregando');
  const [lastError, setLastError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-mcp', { body });
    if (error) {
      const details = 'context' in error && (error as any).context ? await (error as any).context.text() : error.message;
      throw new Error(details);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await invoke({ action: 'status' });
      setStatus(data.status);
      setLastError(data.lastError ?? null);
    } catch (e) {
      setStatus('erro');
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }, [invoke]);

  // OAuth callback handling
  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !user) return;
    (async () => {
      setBusy(true);
      try {
        await invoke({ action: 'callback', code, state });
        toast.success('ERP conectado com sucesso!');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao concluir a conexão');
      } finally {
        setParams({}, { replace: true });
        setBusy(false);
        loadStatus();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user]);

  useEffect(() => {
    if (user) loadStatus();
  }, [user, loadStatus]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const handleConnect = async () => {
    setBusy(true);
    try {
      const redirectUri = `${window.location.origin}/erp`;
      const data = await invoke({ action: 'start', redirectUri });
      window.location.href = data.authUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao iniciar a conexão');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await invoke({ action: 'disconnect' });
      setTools([]);
      toast.success('Conexão removida');
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao desconectar');
    } finally {
      setBusy(false);
    }
  };

  const handleLoadTools = async () => {
    setBusy(true);
    try {
      const data = await invoke({ action: 'tools' });
      setTools(data.tools ?? []);
      toast.success(`${data.tools?.length ?? 0} recursos disponíveis no ERP`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao listar recursos');
    } finally {
      setBusy(false);
    }
  };

  const connected = status === 'connected';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-semibold">Conexão com o ERP</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>ERP Connect</CardTitle>
                <CardDescription>erp-connect.lovable.app — conexão autorizada por login (OAuth)</CardDescription>
              </div>
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? 'Conectado' : status === 'authenticating' ? 'Aguardando autorização' : 'Desconectado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique em conectar, faça login com seu usuário e senha do ERP e autorize este app.
              Nenhuma senha é guardada aqui — apenas uma autorização segura, que pode ser revogada quando quiser.
            </p>
            {lastError && <p className="text-sm text-destructive">{lastError}</p>}
            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <Button onClick={handleConnect} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                  Conectar ao ERP
                </Button>
              ) : (
                <>
                  <Button onClick={handleLoadTools} disabled={busy} variant="secondary">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Ver dados disponíveis
                  </Button>
                  <Button onClick={handleDisconnect} disabled={busy} variant="outline">
                    <Unplug className="mr-2 h-4 w-4" /> Desconectar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {tools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recursos do ERP</CardTitle>
              <CardDescription>O que este app pode consultar no ERP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map((t) => (
                <div key={t.name} className="rounded-md border p-3">
                  <p className="font-medium">{t.title ?? t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ErpConnect;
