import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageSquarePlus, Trash2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import avatarComercial from "@/assets/analista-comercial.png";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

type Thread = { id: string; titulo: string; updated_at: string };
type Consulta = { sql: string; motivo: string; linhas: number; erro?: string };
type Msg = { id: string; role: string; content: string; parts: Consulta[] };

const SUGESTOES = [
  "Quais os 10 produtos que mais venderam em quantidade nos últimos 30 dias?",
  "Como foi o faturamento por dia da semana no último mês?",
  "Compare o faturamento e a margem das lojas no mês passado.",
  "Qual o ticket médio de cada loja nos últimos 30 dias?",
];

export default function AnalistaComercial() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const focar = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const carregarThreads = useCallback(async () => {
    const { data } = await supabase
      .from("ai_threads")
      .select("id, titulo, updated_at")
      .eq("analista", "comercial")
      .order("updated_at", { ascending: false });
    setThreads((data as Thread[]) ?? []);
    return (data as Thread[]) ?? [];
  }, []);

  const criarThread = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id, analista: "comercial", titulo: "Nova conversa" })
      .select("id, titulo, updated_at")
      .single();
    if (error) {
      toast({ title: "Não foi possível criar a conversa", description: error.message, variant: "destructive" });
      return null;
    }
    setThreads((prev) => [data as Thread, ...prev]);
    return data as Thread;
  }, [user]);

  // Rota base: abre a conversa mais recente ou cria uma nova.
  useEffect(() => {
    if (threadId || !user) return;
    let ativo = true;
    (async () => {
      const lista = await carregarThreads();
      if (!ativo) return;
      const alvo = lista[0] ?? (await criarThread());
      if (alvo && ativo) navigate(`/analistas/comercial/${alvo.id}`, { replace: true });
    })();
    return () => {
      ativo = false;
    };
  }, [threadId, user, carregarThreads, criarThread, navigate]);

  useEffect(() => {
    if (user) carregarThreads();
  }, [user, carregarThreads]);

  useEffect(() => {
    if (!threadId) return;
    let ativo = true;
    setCarregando(true);
    (async () => {
      const { data: thread } = await supabase
        .from("ai_threads")
        .select("id")
        .eq("id", threadId)
        .maybeSingle();
      if (!ativo) return;
      if (!thread) {
        // Conversa apagada ou de outro usuário: volta para a rota base.
        setMessages([]);
        setCarregando(false);
        navigate("/analistas/comercial", { replace: true });
        return;
      }
      const { data } = await supabase
        .from("ai_messages")
        .select("id, role, content, parts")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!ativo) return;
      setMessages(
        ((data as any[]) ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          parts: Array.isArray(m.parts) ? (m.parts as Consulta[]) : [],
        })),
      );
      setCarregando(false);
      focar();
    })();
    return () => {
      ativo = false;
    };
  }, [threadId, focar, navigate]);

  async function enviar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || !threadId || enviando) return;
    setEnviando(true);
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: "user", content: pergunta, parts: [] }]);
    try {
      const { data, error } = await supabase.functions.invoke("analista-comercial", {
        body: { threadId, pergunta },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((prev) => [
        ...prev,
        {
          id: (data as any).id ?? `a-${Date.now()}`,
          role: "assistant",
          content: (data as any).resposta,
          parts: ((data as any).consultas ?? []) as Consulta[],
        },
      ]);
      carregarThreads();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: `Não consegui responder agora: ${msg}`, parts: [] },
      ]);
      toast({
        title: "O analista não conseguiu responder",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
      focar();
    }
  }

  async function apagar(id: string) {
    await supabase.from("ai_threads").delete().eq("id", id);
    const restantes = threads.filter((t) => t.id !== id);
    setThreads(restantes);
    if (id === threadId) navigate("/analistas/comercial", { replace: true });
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] min-w-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="p-3">
          <Button
            className="w-full"
            size="sm"
            onClick={async () => {
              const t = await criarThread();
              if (t) navigate(`/analistas/comercial/${t.id}`);
            }}
          >
            <MessageSquarePlus className="mr-1 h-4 w-4" /> Nova conversa
          </Button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                t.id === threadId ? "bg-accent font-medium" : "hover:bg-accent/50"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => navigate(`/analistas/comercial/${t.id}`)}
              >
                {t.titulo}
              </button>
              <button
                type="button"
                aria-label="Apagar conversa"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => apagar(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <img
            src={avatarComercial}
            alt="Avatar do Analista Comercial"
            width={512}
            height={512}
            className="h-10 w-10 rounded-full bg-primary/10 object-cover"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold">Analista Comercial</h1>
            <p className="truncate text-xs text-muted-foreground">
              Pergunte sobre vendas, produtos, lojas, margem e ticket — consulto o ERP na hora.
            </p>
          </div>
        </div>

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {carregando && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}

            {!carregando && messages.length === 0 && (
              <div className="py-10 text-center">
                <img
                  src={avatarComercial}
                  alt="Analista Comercial"
                  width={512}
                  height={512}
                  className="mx-auto h-24 w-24 rounded-full bg-primary/10 object-cover"
                />
                <p className="mt-3 text-sm font-medium">Sobre o que vamos falar hoje?</p>
                <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      className="rounded-lg border bg-card p-3 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
                <MessageContent>
                  {m.parts?.length > 0 && (
                    <details className="mb-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                        <Database className="h-3.5 w-3.5" />
                        {m.parts.length} consulta{m.parts.length > 1 ? "s" : ""} ao ERP
                      </summary>
                      {m.parts.map((c, i) => (
                        <div key={i} className="mt-2 border-t pt-2">
                          <p className="font-medium">{c.motivo}</p>
                          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                            {c.sql}
                          </pre>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {c.erro ? `Erro: ${c.erro}` : `${c.linhas} linha(s)`}
                          </p>
                        </div>
                      ))}
                    </details>
                  )}
                  <MessageResponse>{m.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))}

            {enviando && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Consultando o ERP...</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <PromptInput
            onSubmit={(message, event) => {
              event.preventDefault();
              const texto = message.text ?? "";
              (event.currentTarget as HTMLFormElement).reset();
              enviar(texto);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              autoFocus
              placeholder="Pergunte sobre vendas, produtos, lojas..."
              disabled={enviando || !threadId}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={enviando ? "submitted" : undefined} disabled={enviando || !threadId} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>
    </div>
  );
}
