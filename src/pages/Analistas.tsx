import { Link } from "react-router-dom";
import { ArrowRight, Boxes, ShieldAlert } from "lucide-react";
import avatarComercial from "@/assets/analista-comercial.png";

const Analistas = () => (
  <div className="mx-auto max-w-[1000px] px-4 py-8">
    <h1 className="text-2xl font-bold tracking-tight">Analistas de IA</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Converse com um analista virtual e receba respostas com números buscados direto no ERP.
    </p>

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link
        to="/analistas/comercial"
        className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
      >
        <img
          src={avatarComercial}
          alt="Avatar do Analista Comercial"
          width={512}
          height={512}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-full bg-primary/10 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Analista Comercial</h2>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Vendas, produtos mais vendidos, margem, ticket médio, comparativo de lojas e análises por dia da semana.
          </p>
        </div>
      </Link>

      {[
        { title: "Analista de Estoque", desc: "Giro, cobertura, itens parados e sugestões de compra.", icon: Boxes },
        { title: "Prevenção de Perdas", desc: "Quebras, desvios e itens de maior risco.", icon: ShieldAlert },
      ].map((a) => (
        <div key={a.title} className="flex items-start gap-3 rounded-lg border bg-card/50 p-4 opacity-70">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <a.icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{a.title}</h2>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                em breve
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Analistas;
