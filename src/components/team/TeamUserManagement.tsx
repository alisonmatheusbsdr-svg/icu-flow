import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, Loader2, RefreshCw, Users, UserCheck, UserX, Clock } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { TeamUserCard } from './TeamUserCard';

type AppRole = Database['public']['Enums']['app_role'];
type ApprovalStatus = Database['public']['Enums']['approval_status'];

interface UserUnit {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  nome: string;
  crm: string;
  email: string;
  approval_status: ApprovalStatus;
  roles: AppRole[];
  units: UserUnit[];
  created_at: string;
}

const roleLabels: Record<string, string> = {
  plantonista: 'Plantonista',
  diarista: 'Diarista',
  coordenador: 'Coordenador',
  nir: 'NIR',
  admin: 'Admin'
};

export function TeamUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await supabase.functions.invoke('get-users-with-email', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateApprovalStatus = async (userId: string, status: ApprovalStatus) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: status })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, approval_status: status } : u
      ));
      toast.success(`Usuário ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso`);
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (statusFilter === 'all') return true;
    return user.approval_status === statusFilter;
  });

  const pendingCount = users.filter(u => u.approval_status === 'pending').length;
  const approvedCount = users.filter(u => u.approval_status === 'approved').length;
  const rejectedCount = users.filter(u => u.approval_status === 'rejected').length;

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"><UserCheck className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"><UserX className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-xl md:text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-500">{pendingCount}</p>
              </div>
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-600 dark:text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('approved')}>
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Aprovados</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-500">{approvedCount}</p>
              </div>
              <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-600 dark:text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('rejected')}>
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Rejeitados</p>
                <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-500">{rejectedCount}</p>
              </div>
              <UserX className="h-6 w-6 md:h-8 md:w-8 text-red-600 dark:text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List/Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">
            Equipe Assistencial
            {statusFilter !== 'all' && (
              <span className="ml-2 text-xs md:text-sm font-normal text-muted-foreground">
                ({statusFilter === 'pending' ? 'Pendentes' : statusFilter === 'approved' ? 'Aprovados' : 'Rejeitados'})
              </span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1 md:gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
          ) : isMobile ? (
            // Mobile: Card list
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <TeamUserCard
                  key={user.id}
                  user={user}
                  roleLabels={roleLabels}
                  isUpdating={updatingUser === user.id}
                  onUpdateApproval={updateApprovalStatus}
                />
              ))}
            </div>
          ) : (
            // Desktop: Table
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={updatingUser === user.id ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.crm}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.roles.length > 0 ? (
                          <Badge variant="secondary">
                            {user.roles.map(r => roleLabels[r] || r).join(', ')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem função</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                      <TableCell className="text-right">
                        {user.approval_status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-500 hover:bg-green-500/10"
                              onClick={() => updateApprovalStatus(user.id, 'approved')}
                              disabled={updatingUser === user.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => updateApprovalStatus(user.id, 'rejected')}
                              disabled={updatingUser === user.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {user.approval_status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-500 hover:bg-green-500/10"
                            onClick={() => updateApprovalStatus(user.id, 'approved')}
                            disabled={updatingUser === user.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        {user.approval_status === 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-red-500"
                            onClick={() => updateApprovalStatus(user.id, 'rejected')}
                            disabled={updatingUser === user.id}
                          >
                            Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
