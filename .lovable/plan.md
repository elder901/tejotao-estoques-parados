# Nova governança de navegação

O app deixa de ser "Estoques Parados" e passa a ser um portal de indicadores (Estoque, Comercial, Prevenção de Perdas, Eficiência Operacional). Para isso, troco o cabeçalho atual (links soltos repetidos em cada página) por um menu lateral único com grupos, e crio uma Home de navegação.

## Estrutura de menu proposta

```text
Início (Home / atalhos)

Gestão de Estoque
  - Estoques Parados        /estoques-parados   (tela atual "/")
  - Ruptura                 /ruptura
  - Planos de Ação          /planos

KPIs
  - Indicadores Gerais      /indicadores
  (espaço para: Comercial, Prevenção de Perdas, Eficiência Operacional)

Administração
  - Usuários                /admin
  - Conexão ERP             /erp
  - Sincronização de Dados  /erp-dados
```

Sobre "Receitas": no varejo isso normalmente significa Receita/Vendas. Deixo previsto um grupo **Comercial** dentro de KPIs para receber essas telas; se "Receitas" for outra coisa (ex.: fichas técnicas de produção), é só avisar que eu ajusto o grupo.

## Home (nova tela em `/`)

Página de entrada com cartões por área (Estoque, KPIs, Prevenção de Perdas, Eficiência Operacional), cada um listando as telas já disponíveis e marcando as futuras como "em breve". Assim o app cresce sem quebrar a navegação.

## Detalhes técnicos

- Novo `AppLayout` com `SidebarProvider` + `AppSidebar` (shadcn sidebar, `collapsible="icon"`) e um header fino com `SidebarTrigger`, título da página e botão Sair.
- `src/App.tsx`: rotas protegidas passam a ser filhas do layout via `Outlet`; `/` vira a Home e a tela atual migra para `/estoques-parados` (com redirect para não quebrar links salvos).
- Itens de Administração só aparecem para admin (mesma checagem já usada hoje).
- Removo os headers duplicados de cada página (Index, Ruptura, Indicadores, ActionPlans, Admin, ErpSync, ErpConnect), mantendo apenas o conteúdo; nenhuma lógica de dados ou cálculo é alterada.
- Ajuste de `<title>` e meta description em `index.html` para refletir o novo posicionamento do portal.