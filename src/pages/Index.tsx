import { useState, useEffect, useMemo } from 'react';
import { loadAllData, StockItem, getUniqueDepartments, getUniqueSuppliers, getUniqueUnits, formatCurrency, formatNumber } from '@/lib/csvParser';
import { FilterBar, type DaysRange } from '@/components/FilterBar';
import { StockTable } from '@/components/StockTable';
import { ItemDrilldown } from '@/components/ItemDrilldown';
import { Package, TrendingDown, AlertTriangle, BarChart3, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedDaysRanges, setSelectedDaysRanges] = useState<DaysRange[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');

  useEffect(() => {
    loadAllData().then(data => {
      setAllItems(data);
      setLoading(false);
    });
  }, []);

  const filteredItems = useMemo(() => {
    let result = allItems;

    if (selectedUnit !== 'all') {
      result = result.filter(i => i.codUnidade === selectedUnit);
    }
    if (selectedDepartment !== 'all') {
      result = result.filter(i => i.departamento === selectedDepartment);
    }
    if (selectedSupplier !== 'all') {
      result = result.filter(i => i.fornecedor === selectedSupplier);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.descricao.toLowerCase().includes(term) ||
        i.codItem.toLowerCase().includes(term)
      );
    }
    if (selectedDaysRanges.length > 0) {
      result = result.filter(i => {
        return selectedDaysRanges.some(range => {
          switch (range) {
            case '0-30': return i.diasEstoque >= 0 && i.diasEstoque < 30;
            case '30-60': return i.diasEstoque >= 30 && i.diasEstoque < 60;
            case '60-90': return i.diasEstoque >= 60 && i.diasEstoque < 90;
            case '90-120': return i.diasEstoque >= 90 && i.diasEstoque < 120;
            case '120+': return i.diasEstoque >= 120;
            default: return true;
          }
        });
      });
    }

    return result
      .sort((a, b) => b.estoqueCustoMedio - a.estoqueCustoMedio)
      .slice(0, 50);
  }, [allItems, selectedUnit, selectedDepartment, selectedSupplier, searchTerm, selectedDaysRanges]);

  const units = useMemo(() => getUniqueUnits(allItems), [allItems]);
  const departments = useMemo(() => {
    const base = selectedUnit !== 'all' ? allItems.filter(i => i.codUnidade === selectedUnit) : allItems;
    return getUniqueDepartments(base);
  }, [allItems, selectedUnit]);
  const suppliers = useMemo(() => {
    let base = allItems;
    if (selectedUnit !== 'all') base = base.filter(i => i.codUnidade === selectedUnit);
    if (selectedDepartment !== 'all') base = base.filter(i => i.departamento === selectedDepartment);
    return getUniqueSuppliers(base);
  }, [allItems, selectedUnit, selectedDepartment]);

  const totalEstoque = filteredItems.reduce((s, i) => s + i.estoqueCustoMedio, 0);
  const avgDias = filteredItems.length > 0 ? filteredItems.reduce((s, i) => s + i.diasEstoque, 0) / filteredItems.length : 0;
  const criticalCount = filteredItems.filter(i => i.diasEstoque >= 90).length;

  const handleSelectItem = (item: StockItem) => {
    setSelectedItem(item);
    setDrilldownOpen(true);
  };

  const clearFilters = () => {
    setSelectedUnit('all');
    setSelectedDepartment('all');
    setSelectedSupplier('all');
    setSearchTerm('');
    setSelectedDaysRanges([]);
    setSupplierSearch('');
  };

  const handleDaysRangeToggle = (range: DaysRange) => {
    setSelectedDaysRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dados de estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Supermercado Tejotão</h1>
              <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5">Gestão de Estoques Parados — Plano de Ação</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/planos')} className="text-primary-foreground hover:bg-primary-foreground/10">
                <ClipboardList className="h-4 w-4 mr-1" /> Planos de Ação
              </Button>
              <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-md px-3 py-1.5">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">{allItems.length.toLocaleString('pt-BR')} itens carregados</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<DollarSign />} label="Valor Total Top 50" value={formatCurrency(totalEstoque)} />
          <KpiCard icon={<TrendingDown />} label="Média Dias Estoque" value={`${formatNumber(avgDias, 0)} dias`} />
          <KpiCard icon={<AlertTriangle />} label="Itens Críticos (90+ dias)" value={String(criticalCount)} danger />
          <KpiCard icon={<BarChart3 />} label="Itens no Ranking" value={String(filteredItems.length)} />
        </div>

        {/* Filters */}
        <FilterBar
          units={units}
          departments={departments}
          suppliers={suppliers}
          selectedUnit={selectedUnit}
          selectedDepartment={selectedDepartment}
          selectedSupplier={selectedSupplier}
          searchTerm={searchTerm}
          selectedDaysRanges={selectedDaysRanges}
          supplierSearch={supplierSearch}
          onUnitChange={setSelectedUnit}
          onDepartmentChange={setSelectedDepartment}
          onSupplierChange={setSelectedSupplier}
          onSearchChange={setSearchTerm}
          onDaysRangeToggle={handleDaysRangeToggle}
          onSupplierSearchChange={setSupplierSearch}
          onClearFilters={clearFilters}
        />

        {/* Results header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Top 50 — Ranking por Valor de Estoque
          </h2>
          <span className="text-xs text-muted-foreground">
            Clique em um item para definir o plano de ação
          </span>
        </div>

        {/* Table */}
        <StockTable items={filteredItems} onSelectItem={handleSelectItem} />
      </main>

      {/* Drilldown */}
      <ItemDrilldown
        item={selectedItem}
        open={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
      />
    </div>
  );
};

function DollarSign() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

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

export default Index;
