import { supabase } from '@/integrations/supabase/client';

export interface ActionPlan {
  id: string;
  cod_item: string;
  cod_unidade: string;
  user_id: string;
  responsavel: string;
  estrategia: string;
  prazo: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  created_at: string;
  updated_at: string;
  // joined
  user_name?: string;
}

export async function getActionPlans(): Promise<ActionPlan[]> {
  const { data, error } = await supabase
    .from('action_plans')
    .select('*, profiles:user_id(name)')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((d: any) => ({
    ...d,
    user_name: d.profiles?.name || 'Desconhecido',
  }));
}

export async function getActionPlan(codItem: string, codUnidade: string): Promise<ActionPlan | undefined> {
  const { data } = await supabase
    .from('action_plans')
    .select('*, profiles:user_id(name)')
    .eq('cod_item', codItem)
    .eq('cod_unidade', codUnidade)
    .maybeSingle();

  if (!data) return undefined;
  return { ...data, user_name: (data as any).profiles?.name || 'Desconhecido' } as ActionPlan;
}

export async function saveActionPlan(plan: {
  cod_item: string;
  cod_unidade: string;
  responsavel: string;
  estrategia: string;
  prazo: string | null;
  status: string;
  observacoes: string;
}): Promise<ActionPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use upsert to handle both insert and update in one call
  const { data, error } = await supabase
    .from('action_plans')
    .upsert({
      cod_item: plan.cod_item,
      cod_unidade: plan.cod_unidade,
      user_id: user.id,
      responsavel: plan.responsavel,
      estrategia: plan.estrategia,
      prazo: plan.prazo || null,
      status: plan.status,
      observacoes: plan.observacoes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'cod_item,cod_unidade',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ActionPlan;
}

export async function deleteActionPlan(codItem: string, codUnidade: string): Promise<void> {
  const { data } = await supabase
    .from('action_plans')
    .select('id')
    .eq('cod_item', codItem)
    .eq('cod_unidade', codUnidade)
    .maybeSingle();

  if (!data) return;

  const { error } = await supabase
    .from('action_plans')
    .delete()
    .eq('id', data.id);

  if (error) throw error;
}
