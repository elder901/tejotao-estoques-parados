import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, UserPlus, Shield, Upload, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

interface CsvUploadRecord {
  id: string;
  file_name: string;
  unit_code: string;
  periodo_referencia: string;
  uploaded_at: string;
}

const UNITS = [
  { code: '001', name: 'Mato Grosso', filePrefix: 'Gloja1F' },
  { code: '002', name: 'Melo Viana', filePrefix: 'Gloja2F' },
  { code: '003', name: 'Amazonas', filePrefix: 'Gloja3F' },
];

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // CSV upload state
  const [periodoRef, setPeriodoRef] = useState('');
  const [csvFiles, setCsvFiles] = useState<{ [unitCode: string]: File | null }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<CsvUploadRecord[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) console.error('Error fetching users:', error);
      if (data) setUsers(data as UserProfile[]);
    } catch (e) {
      console.error('Exception fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUploads = async () => {
    const { data } = await supabase
      .from('csv_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(20);
    if (data) setUploadHistory(data as CsvUploadRecord[]);
  };

  useEffect(() => {
    if (profile?.is_admin) {
      fetchUsers();
      fetchUploads();
    }
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

  const handleFileChange = (unitCode: string, file: File | null) => {
    setCsvFiles(prev => ({ ...prev, [unitCode]: file }));
  };

  const handleUploadCSVs = async () => {
    const filesToUpload = Object.entries(csvFiles).filter(([, f]) => f !== null);
    if (filesToUpload.length === 0) {
      toast.error('Selecione pelo menos um arquivo CSV');
      return;
    }
    if (!periodoRef.trim()) {
      toast.error('Informe o período de referência');
      return;
    }

    setUploading(true);
    let successCount = 0;
    try {
      for (const [unitCode, file] of filesToUpload) {
        if (!file) continue;
        const timestamp = Date.now();
        const storagePath = `${unitCode}/${timestamp}_${file.name}`;

        console.log(`Uploading ${file.name} (${file.size} bytes, type: ${file.type}) to ${storagePath}...`);
        toast.info(`Enviando ${file.name}...`);
        
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('csv-files')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          console.log('Upload result:', { uploadData, uploadError });

          if (uploadError) {
            console.error('Storage upload error:', JSON.stringify(uploadError));
            toast.error(`Erro no upload ${file.name}: ${uploadError.message}`);
            continue;
          }
        } catch (uploadEx: any) {
          console.error('Upload exception:', uploadEx);
          toast.error(`Exceção no upload ${file.name}: ${uploadEx.message}`);
          continue;
        }

        console.log(`Inserting record for ${file.name}...`);
        const { error: insertError } = await supabase
          .from('csv_uploads')
          .insert({
            file_name: file.name,
            unit_code: unitCode,
            storage_path: storagePath,
            periodo_referencia: periodoRef.trim(),
            uploaded_by: user!.id,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error(`Erro ao registrar ${file.name}: ${insertError.message}`);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
        setCsvFiles({});
        setPeriodoRef('');
        Object.values(fileInputRefs.current).forEach(input => {
          if (input) input.value = '';
        });
        fetchUploads();
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast.error(err.message || 'Erro no upload');
    }
    setUploading(false);
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
              <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Administração</h1>
              <p className="text-primary-foreground/70 text-xs mt-0.5">Usuários e dados de estoque</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-5 space-y-6">
        {/* CSV Upload */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" /> Atualizar Dados de Estoque (CSV)
          </h2>

          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Período de Referência *
            </label>
            <Input
              value={periodoRef}
              onChange={e => setPeriodoRef(e.target.value)}
              placeholder="Ex: Janeiro 2026, Semana 01-07/02/2026"
              className="h-9 text-sm max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {UNITS.map(unit => (
              <div key={unit.code} className="border rounded-md p-3">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  <FileSpreadsheet className="h-3.5 w-3.5 inline mr-1" />
                  {unit.code} - {unit.name}
                </label>
                <input
                  ref={el => { fileInputRefs.current[unit.code] = el; }}
                  type="file"
                  accept=".csv,.CSV"
                  onChange={e => handleFileChange(unit.code, e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary"
                />
                {csvFiles[unit.code] && (
                  <p className="text-xs text-primary mt-1 font-medium">✓ {csvFiles[unit.code]!.name}</p>
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleUploadCSVs} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Enviar Arquivos
          </Button>
        </div>

        {/* Upload History */}
        {uploadHistory.length > 0 && (
          <div className="bg-card border rounded-lg p-5">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" /> Histórico de Atualizações
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5 hover:bg-primary/5">
                    <TableHead className="text-xs font-bold">Período</TableHead>
                    <TableHead className="text-xs font-bold">Unidade</TableHead>
                    <TableHead className="text-xs font-bold">Arquivo</TableHead>
                    <TableHead className="text-xs font-bold">Enviado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadHistory.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-semibold text-primary">{u.periodo_referencia}</TableCell>
                      <TableCell className="text-xs">{u.unit_code} - {UNITS.find(unit => unit.code === u.unit_code)?.name || u.unit_code}</TableCell>
                      <TableCell className="text-xs">{u.file_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.uploaded_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

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
