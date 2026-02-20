export interface ActionPlan {
  id: string;
  codItem: string;
  codUnidade: string;
  responsavel: string;
  estrategia: string;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
}

const STORAGE_KEY = 'tejotao_action_plans';

export function getActionPlans(): ActionPlan[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getActionPlan(codItem: string, codUnidade: string): ActionPlan | undefined {
  return getActionPlans().find(p => p.codItem === codItem && p.codUnidade === codUnidade);
}

export function saveActionPlan(plan: Omit<ActionPlan, 'id' | 'criadoEm' | 'atualizadoEm'>): ActionPlan {
  const plans = getActionPlans();
  const existing = plans.findIndex(p => p.codItem === plan.codItem && p.codUnidade === plan.codUnidade);
  const now = new Date().toISOString();

  if (existing >= 0) {
    plans[existing] = { ...plans[existing], ...plan, atualizadoEm: now };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return plans[existing];
  }

  const newPlan: ActionPlan = {
    ...plan,
    id: crypto.randomUUID(),
    criadoEm: now,
    atualizadoEm: now,
  };
  plans.push(newPlan);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  return newPlan;
}
