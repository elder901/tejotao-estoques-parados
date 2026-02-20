import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DaysRange = '0-30' | '30-60' | '60-90' | '90-120' | '120+';

interface FilterBarProps {
  units: { code: string; name: string }[];
  departments: string[];
  suppliers: string[];
  selectedUnit: string;
  selectedDepartment: string;
  selectedSupplier: string;
  searchTerm: string;
  selectedDaysRanges: DaysRange[];
  supplierSearch: string;
  onUnitChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onSupplierChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onDaysRangeToggle: (range: DaysRange) => void;
  onSupplierSearchChange: (val: string) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  units, departments, suppliers,
  selectedUnit, selectedDepartment, selectedSupplier, searchTerm,
  selectedDaysRanges, supplierSearch,
  onUnitChange, onDepartmentChange, onSupplierChange, onSearchChange,
  onDaysRangeToggle, onSupplierSearchChange, onClearFilters,
}: FilterBarProps) {
  const hasFilters = selectedUnit !== 'all' || selectedDepartment !== 'all' || selectedSupplier !== 'all' || searchTerm !== '' || selectedDaysRanges.length > 0 || supplierSearch !== '';

  const DAYS_RANGES: { value: DaysRange; label: string }[] = [
    { value: '0-30', label: '0-30 dias' },
    { value: '30-60', label: '30-60 dias' },
    { value: '60-90', label: '60-90 dias' },
    { value: '90-120', label: '90-120 dias' },
    { value: '120+', label: '+120 dias' },
  ];

  const filteredSuppliers = supplierSearch
    ? suppliers.filter(s => s.toLowerCase().includes(supplierSearch.toLowerCase()))
    : suppliers;

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="h-4 w-4 text-accent" />
        Filtros
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Unidade</label>
          <Select value={selectedUnit} onValueChange={onUnitChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {units.map(u => (
                <SelectItem key={u.code} value={u.code}>{u.code} - {u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Departamento</label>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Departamentos</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Fornecedor</label>
          <Select value={selectedSupplier} onValueChange={onSupplierChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Buscar fornecedor..."
                  value={supplierSearch}
                  onChange={e => onSupplierSearchChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <SelectItem value="all">Todos os Fornecedores</SelectItem>
              {filteredSuppliers.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar Item</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Código ou descrição..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Days range flags */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Faixa de Dias de Estoque</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => onDaysRangeToggle(range.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedDaysRanges.includes(range.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
