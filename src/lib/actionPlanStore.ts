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
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  // Fetch profile names for all unique user_ids
  const userIds = [...new Set(data.map((d: any) => d.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return data.map((d: any) => ({
    ...d,
    // profiles are readable only for self/admins; fall back to the plan owner name
    user_name: profileMap.get(d.user_id) || d.responsavel || 'Desconhecido',
  }));
}

export async function getActionPlan(codItem: string, codUnidade: string): Promise<ActionPlan | undefined> {
  const { data } = await supabase
    .from('action_plans')
    .select('*')
    .eq('cod_item', codItem)
    .eq('cod_unidade', codUnidade)
    .maybeSingle();

  if (!data) return undefined;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', data.user_id)
    .maybeSingle();

  return { ...data, user_name: profile?.name || data.responsavel || 'Desconhecido' } as ActionPlan;
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

  // Check if a plan already exists for this item+unit
  const { data: existing } = await supabase
    .from('action_plans')
    .select('id')
    .eq('cod_item', plan.cod_item)
    .eq('cod_unidade', plan.cod_unidade)
    .maybeSingle();

  if (existing) {
    // Update existing plan
    const { data, error } = await supabase
      .from('action_plans')
      .update({
        responsavel: plan.responsavel,
        estrategia: plan.estrategia,
        prazo: plan.prazo || null,
        status: plan.status,
        observacoes: plan.observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as ActionPlan;
  }

  // Insert new plan
  const { data, error } = await supabase
    .from('action_plans')
    .insert({
      cod_item: plan.cod_item,
      cod_unidade: plan.cod_unidade,
      user_id: user.id,
      responsavel: plan.responsavel,
      estrategia: plan.estrategia,
      prazo: plan.prazo || null,
      status: plan.status,
      observacoes: plan.observacoes,
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
