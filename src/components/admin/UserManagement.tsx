import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Check, X, Loader2, RefreshCw, Users, UserCheck, UserX, Clock } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

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

interface UnitOption {
  id: string;
  name: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'plantonista', label: 'Plantonista' },
  { value: 'diarista', label: 'Diarista' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'admin', label: 'Administrador' },
];

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [allUnits, setAllUnits] = useState<UnitOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

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
      setAllUnits(response.data.allUnits || []);
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

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    setUpdatingUser(userId);
    try {
      // Remove existing roles for this user
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, roles: [newRole] } : u
      ));
      toast.success('Função atualizada com sucesso');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função');
    } finally {
      setUpdatingUser(null);
    }
  };

  const toggleUserUnit = async (userId: string, unitId: string, isAssigned: boolean) => {
    setUpdatingUser(userId);
    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('user_units')
          .delete()
          .eq('user_id', userId)
          .eq('unit_id', unitId);

        if (error) throw error;

        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, units: u.units.filter(unit => unit.id !== unitId) } 
            : u
        ));
      } else {
        // Add assignment
        const { error } = await supabase
          .from('user_units')
          .insert({ user_id: userId, unit_id: unitId });

        if (error) throw error;

        const unitName = allUnits.find(u => u.id === unitId)?.name || 'Unknown';
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, units: [...u.units, { id: unitId, name: unitName }] } 
            : u
        ));
      }
      toast.success('Unidade atualizada com sucesso');
    } catch (error) {
      console.error('Error toggling unit:', error);
      toast.error('Erro ao atualizar unidade');
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><UserCheck className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><UserX className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('pending')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('approved')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('rejected')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
                <p className="text-2xl font-bold text-red-500">{rejectedCount}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Gerenciar Usuários
            {statusFilter !== 'all' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Filtro: {statusFilter === 'pending' ? 'Pendentes' : statusFilter === 'approved' ? 'Aprovados' : 'Rejeitados'})
              </span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={updatingUser === user.id ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.crm}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                      <TableCell>
                        <Select
                          value={user.roles[0] || ''}
                          onValueChange={(value) => updateUserRole(user.id, value as AppRole)}
                          disabled={updatingUser === user.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {allUnits.map((unit) => {
                            const isAssigned = user.units.some(u => u.id === unit.id);
                            return (
                              <label
                                key={unit.id}
                                className="flex items-center gap-1 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={isAssigned}
                                  onCheckedChange={() => toggleUserUnit(user.id, unit.id, isAssigned)}
                                  disabled={updatingUser === user.id}
                                />
                                <span className={isAssigned ? 'text-foreground' : 'text-muted-foreground'}>
                                  {unit.name}
                                </span>
                              </label>
                            );
                          })}
                          {allUnits.length === 0 && (
                            <span className="text-muted-foreground text-sm">Sem unidades</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.approval_status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              onClick={() => updateApprovalStatus(user.id, 'approved')}
                              disabled={updatingUser === user.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
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
                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
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
                            className="text-muted-foreground hover:text-red-400"
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
