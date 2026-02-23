import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StockItem, formatCurrency, formatNumber } from '@/lib/csvParser';
import { getActionPlan, saveActionPlan, type ActionPlan } from '@/lib/actionPlanStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, Package, Target, BarChart3, User } from 'lucide-react';
import { toast } from 'sonner';

interface ItemDrilldownProps {
  item: StockItem | null;
  open: boolean;
  onClose: () => void;
}

const ESTRATEGIAS = [
  'Promoção / Queima de Estoque',
  'Remarcação de Preço',
  'Degustação / Demonstração',
  'Transferência entre Lojas',
  'Negociação com Fornecedor (Troca/Devolução)',
  'Cross Merchandising',
  'Exposição em Ponto Extra',
  'Bonificação ao Cliente',
  'Venda Casada / Combo',
  'Doação (Próximo ao Vencimento)',
  'Outro',
];

export function ItemDrilldown({ item, open, onClose }: ItemDrilldownProps) {
  const [responsavel, setResponsavel] = useState('');
  const [estrategia, setEstrategia] = useState('');
  const [prazo, setPrazo] = useState('');
  const [status, setStatus] = useState<ActionPlan['status']>('pendente');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      getActionPlan(item.codItem, item.codUnidade).then(plan => {
        if (plan) {
          setResponsavel(plan.responsavel);
          setEstrategia(plan.estrategia);
          setPrazo(plan.prazo || '');
          setStatus(plan.status);
          setObservacoes(plan.observacoes);
        } else {
          setResponsavel('');
          setEstrategia('');
          setPrazo('');
          setStatus('pendente');
          setObservacoes('');
        }
      });
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    if (!responsavel.trim()) { toast.error('Informe o responsável'); return; }
    if (!estrategia) { toast.error('Selecione uma estratégia'); return; }
    setSaving(true);
    try {
      await saveActionPlan({
        cod_item: item.codItem,
        cod_unidade: item.codUnidade,
        responsavel: responsavel.trim(),
        estrategia,
        prazo: prazo || null,
        status,
        observacoes: observacoes.trim(),
      });
      toast.success('Plano de ação salvo com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-foreground">Detalhes do Item</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="bg-primary/5 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-foreground text-sm">{item.descricao}</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Código" value={item.codItem} />
              <InfoRow icon={<BarChart3 className="h-3.5 w-3.5" />} label="Grupo" value={item.grupo} />
              <InfoRow icon={<Target className="h-3.5 w-3.5" />} label="Departamento" value={item.departamento} />
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Fornecedor" value={item.fornecedor} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Estoque (R$)" value={formatCurrency(item.estoqueCustoMedio)} accent />
              <MetricCard label="Dias Estoque" value={formatNumber(item.diasEstoque, 0)} danger={item.diasEstoque >= 90} warning={item.diasEstoque >= 45 && item.diasEstoque < 90} />
              <MetricCard label="Qtd Estoque" value={formatNumber(item.quantidadeEstoque, 0)} />
              <MetricCard label="Giro" value={formatNumber(item.giro)} />
              <MetricCard label="Vendas (R$)" value={formatCurrency(item.vendasCustoMedio)} />
              <MetricCard label="Vd Média 30d" value={formatNumber(item.vdMedia30)} />
              <MetricCard label="Vd Média 90d" value={formatNumber(item.vdMedia90)} />
              <MetricCard label="Vd Média 365d" value={formatNumber(item.vdMedia365)} />
              <MetricCard label="Unidade" value={`${item.codUnidade} - ${item.nomeUnidade}`} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" /> Plano de Ação
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável *</label>
                <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do comprador responsável" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Estratégia *</label>
                <Select value={estrategia} onValueChange={setEstrategia}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione a estratégia" /></SelectTrigger>
                  <SelectContent>
                    {ESTRATEGIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo</label>
                  <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={status} onValueChange={(v: ActionPlan['status']) => setStatus(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes da ação, negociações, contatos..." className="text-sm min-h-[80px]" />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Plano de Ação'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="font-medium">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, accent, danger, warning }: { label: string; value: string; accent?: boolean; danger?: boolean; warning?: boolean }) {
  return (
    <div className="bg-card border rounded-md p-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${danger ? 'text-destructive' : warning ? 'text-accent' : accent ? 'text-primary' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
