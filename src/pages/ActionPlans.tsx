import { useState, useEffect, useMemo } from 'react';
import { loadAllData, StockItem, formatCurrency, formatNumber, getUniqueUnits, getUniqueDepartments } from '@/lib/csvParser';
import { getActionPlans, type ActionPlan } from '@/lib/actionPlanStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function DollarSign() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

const ActionPlans = () => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  useEffect(() => {
    loadAllData().then(data => {
      setAllItems(data);
      setLoading(false);
    });
  }, []);

  const plans = useMemo(() => getActionPlans(), [allItems]);

  const enrichedPlans = useMemo(() => {
    return plans.map(plan => {
      const item = allItems.find(i => i.codItem === plan.codItem && i.codUnidade === plan.codUnidade);
      return { plan, item };
    }).filter(e => e.item);
  }, [plans, allItems]);

  const filtered = useMemo(() => {
    let result = enrichedPlans;
    if (filterStatus !== 'all') result = result.filter(e => e.plan.status === filterStatus);
    if (filterUnit !== 'all') result = result.filter(e => e.item!.codUnidade === filterUnit);
    if (filterDepartment !== 'all') result = result.filter(e => e.item!.departamento === filterDepartment);
    return result;
  }, [enrichedPlans, filterStatus, filterUnit, filterDepartment]);

  const units = useMemo(() => getUniqueUnits(allItems), [allItems]);
  const departments = useMemo(() => {
    const base = filterUnit !== 'all' ? allItems.filter(i => i.codUnidade === filterUnit) : allItems;
    return getUniqueDepartments(base);
  }, [allItems, filterUnit]);

  const totalComPlano = enrichedPlans.reduce((s, e) => s + (e.item?.estoqueCustoMedio || 0), 0);
  const totalSemPlano = useMemo(() => {
    const planKeys = new Set(plans.map(p => `${p.codItem}-${p.codUnidade}`));
    return allItems.filter(i => !planKeys.has(`${i.codItem}-${i.codUnidade}`)).reduce((s, i) => s + i.estoqueCustoMedio, 0);
  }, [allItems, plans]);

  const statusCounts = useMemo(() => ({
    pendente: enrichedPlans.filter(e => e.plan.status === 'pendente').length,
    em_andamento: enrichedPlans.filter(e => e.plan.status === 'em_andamento').length,
    concluido: enrichedPlans.filter(e => e.plan.status === 'concluido').length,
  }), [enrichedPlans]);

  const filteredValue = filtered.reduce((s, e) => s + (e.item?.estoqueCustoMedio || 0), 0);

  const statusBadge = (status: ActionPlan['status']) => {
    switch (status) {
      case 'pendente': return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'em_andamento': return <Badge className="text-xs bg-accent text-accent-foreground"><Clock className="h-3 w-3 mr-1" />Em Andamento</Badge>;
      case 'concluido': return <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Análise de Planos de Ação</h1>
                <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5">Acompanhamento e valores dos planos definidos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={<DollarSign />} label="Valor c/ Plano" value={formatCurrency(totalComPlano)} />
          <KpiCard icon={<TrendingDown />} label="Valor s/ Plano" value={formatCurrency(totalSemPlano)} danger />
          <KpiCard icon={<AlertTriangle />} label="Pendentes" value={String(statusCounts.pendente)} danger />
          <KpiCard icon={<Clock />} label="Em Andamento" value={String(statusCounts.em_andamento)} />
          <KpiCard icon={<CheckCircle2 />} label="Concluídos" value={String(statusCounts.concluido)} />
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Unidade</label>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map(u => <SelectItem key={u.code} value={u.code}>{u.code} - {u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Departamento</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {filtered.length} plano(s) — Valor total: {formatCurrency(filteredValue)}
          </h2>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className="text-xs font-bold">Código</TableHead>
                  <TableHead className="text-xs font-bold min-w-[200px]">Descrição</TableHead>
                  <TableHead className="text-xs font-bold">Unidade</TableHead>
                  <TableHead className="text-xs font-bold">Departamento</TableHead>
                  <TableHead className="text-xs font-bold">Fornecedor</TableHead>
                  <TableHead className="text-xs font-bold text-right">Estoque (R$)</TableHead>
                  <TableHead className="text-xs font-bold text-center">Dias</TableHead>
                  <TableHead className="text-xs font-bold">Responsável</TableHead>
                  <TableHead className="text-xs font-bold">Estratégia</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ plan, item }) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-xs font-mono">{plan.codItem}</TableCell>
                    <TableCell className="text-xs font-medium">{item!.descricao}</TableCell>
                    <TableCell className="text-xs">{item!.codUnidade}</TableCell>
                    <TableCell className="text-xs">{item!.departamento}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{item!.fornecedor}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatCurrency(item!.estoqueCustoMedio)}</TableCell>
                    <TableCell className="text-xs text-center">{formatNumber(item!.diasEstoque, 0)}</TableCell>
                    <TableCell className="text-xs">{plan.responsavel}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{plan.estrategia}</TableCell>
                    <TableCell className="text-center">{statusBadge(plan.status)}</TableCell>
                    <TableCell className="text-xs">{plan.prazo || '—'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                      Nenhum plano de ação encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

function KpiCard({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-card rounded-lg border p-3 sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <span className="text-accent">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-lg sm:text-xl font-bold ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

export default ActionPlans;
