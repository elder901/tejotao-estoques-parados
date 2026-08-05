import { Link } from "react-router-dom";
import {
  Boxes,
  PackageX,
  ClipboardList,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Card = { title: string; desc: string; url?: string; icon: React.ComponentType<{ className?: string }> };

const areas: { area: string; cards: Card[] }[] = [
  {
    area: "Gestão de Estoque",
    cards: [
      { title: "Estoques Parados", desc: "Ranking de itens com baixo giro e valor imobilizado", url: "/estoques-parados", icon: Boxes },
      { title: "Ruptura", desc: "Itens zerados e não bloqueados, % de ruptura e perda estimada", url: "/ruptura", icon: PackageX },
      { title: "Planos de Ação", desc: "Acompanhamento das tratativas por comprador", url: "/planos", icon: ClipboardList },
    ],
  },
  {
    area: "KPIs",
    cards: [
      { title: "Indicadores Gerais", desc: "Fechamento mensal em três visões comparativas", url: "/indicadores", icon: BarChart3 },
      { title: "Comercial", desc: "Receita, margem e mix por loja e departamento", icon: TrendingUp },
      { title: "Prevenção de Perdas", desc: "Quebras, perdas e desvios operacionais", icon: ShieldAlert },
      { title: "Eficiência Operacional", desc: "Produtividade e indicadores de processo", icon: Gauge },
    ],
  },
];

const Home = () => {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Olá{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Portal de indicadores de estoque, comercial, prevenção de perdas e eficiência operacional.
      </p>

      {areas.map((grupo) => (
        <section key={grupo.area} className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{grupo.area}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grupo.cards.map((c) => {
              const content = (
                <>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <c.icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    {c.url ? (
                      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="ml-auto rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        em breve
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{c.desc}</p>
                </>
              );
              return c.url ? (
                <Link
                  key={c.title}
                  to={c.url}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  {content}
                </Link>
              ) : (
                <div key={c.title} className="rounded-lg border bg-card/50 p-4 opacity-70">
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default Home;