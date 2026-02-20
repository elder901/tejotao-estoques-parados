import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterBarProps {
  units: { code: string; name: string }[];
  departments: string[];
  suppliers: string[];
  selectedUnit: string;
  selectedDepartment: string;
  selectedSupplier: string;
  searchTerm: string;
  onUnitChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onSupplierChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  units, departments, suppliers,
  selectedUnit, selectedDepartment, selectedSupplier, searchTerm,
  onUnitChange, onDepartmentChange, onSupplierChange, onSearchChange, onClearFilters,
}: FilterBarProps) {
  const hasFilters = selectedUnit !== 'all' || selectedDepartment !== 'all' || selectedSupplier !== 'all' || searchTerm !== '';

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
              <SelectItem value="all">Todos os Fornecedores</SelectItem>
              {suppliers.map(s => (
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
    </div>
  );
}
