import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Boxes,
  PackageX,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  PlugZap,
  RefreshCw,
  Users,
  ShieldAlert,
  Gauge,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean };

const estoque: Item[] = [
  { title: "Estoques Parados", url: "/estoques-parados", icon: Boxes },
  { title: "Planos de Ação", url: "/planos", icon: ClipboardList },
];

const comercial: Item[] = [
  { title: "Indicadores Gerais", url: "/indicadores", icon: BarChart3 },
  { title: "Ruptura", url: "/ruptura", icon: PackageX },
];

const kpis: Item[] = [
  { title: "Prevenção de Perdas", url: "/indicadores", icon: ShieldAlert, soon: true },
  { title: "Eficiência Operacional", url: "/indicadores", icon: Gauge, soon: true },
];

const admin: Item[] = [
  { title: "Usuários", url: "/admin", icon: Users },
  { title: "Conexão ERP", url: "/erp", icon: PlugZap },
  { title: "Dados e Regras", url: "/erp-dados", icon: RefreshCw },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile } = useAuth();

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={!item.soon && pathname === item.url}
                tooltip={item.title}
              >
                {item.soon ? (
                  <span className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 truncate">
                        {item.title}
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">em breve</span>
                      </span>
                    )}
                  </span>
                ) : (
                  <NavLink to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">Tejotão</p>
              <p className="truncate text-[11px] text-muted-foreground">Eficiência Operacional</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Início">
                  <NavLink to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Início</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {renderGroup("Gestão de Estoque", estoque)}
        {renderGroup("Comercial", comercial)}
        {renderGroup("KPIs", kpis)}
        {profile?.is_admin && renderGroup("Administração", admin)}
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;