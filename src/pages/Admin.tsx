import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (profile?.is_admin) fetchUsers();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_admin) return <Navigate to="/" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: { email, password, name: name.trim() },
      });
      if (res.error) {
        toast.error(res.error.message || 'Erro ao criar usuário');
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Usuário ${name} criado com sucesso!`);
        setName('');
        setEmail('');
        setPassword('');
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    }
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1000px] mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Administração de Usuários</h1>
              <p className="text-primary-foreground/70 text-xs mt-0.5">Criar e gerenciar compradores</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-5 space-y-6">
        {/* Create User Form */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-accent" /> Criar Novo Comprador
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do comprador" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@tejotao.com" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Senha *</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-9 text-sm" />
            </div>
            <Button type="submit" disabled={creating} className="h-9">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Criar
            </Button>
          </form>
        </div>

        {/* Users List */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className="text-xs font-bold">Nome</TableHead>
                <TableHead className="text-xs font-bold">Tipo</TableHead>
                <TableHead className="text-xs font-bold">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell>{u.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">Comprador</Badge>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Admin;
