import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ChevronDown, UserCheck, UserX, Clock, Mail, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

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

interface UserCardProps {
  user: UserData;
  allUnits: UnitOption[];
  roles: { value: AppRole; label: string }[];
  isUpdating: boolean;
  onUpdateApproval: (userId: string, status: ApprovalStatus) => void;
  onUpdateRole: (userId: string, role: AppRole) => void;
  onToggleUnit: (userId: string, unitId: string, isAssigned: boolean) => void;
}

export function UserCard({
  user,
  allUnits,
  roles,
  isUpdating,
  onUpdateApproval,
  onUpdateRole,
  onToggleUnit
}: UserCardProps) {
  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
            <UserCheck className="w-3 h-3" /> Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 gap-1">
            <UserX className="w-3 h-3" /> Rejeitado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        );
    }
  };

  return (
    <Card className={cn("transition-opacity", isUpdating && "opacity-50")}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{user.nome}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {user.crm}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(user.approval_status)}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-state-open:rotate-180" />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-4 border-t">
            {/* Role selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Função</label>
              <Select
                value={user.roles[0] || ''}
                onValueChange={(value) => onUpdateRole(user.id, value as AppRole)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecionar função..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Units selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unidades</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {allUnits.map((unit) => {
                  const isAssigned = user.units.some(u => u.id === unit.id);
                  return (
                    <label
                      key={unit.id}
                      className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-md hover:bg-muted"
                    >
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => onToggleUnit(user.id, unit.id, isAssigned)}
                        disabled={isUpdating}
                      />
                      <span className={isAssigned ? 'text-foreground' : 'text-muted-foreground'}>
                        {unit.name}
                      </span>
                    </label>
                  );
                })}
                {allUnits.length === 0 && (
                  <span className="text-muted-foreground text-sm col-span-2">
                    Nenhuma unidade cadastrada
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {user.approval_status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                    onClick={() => onUpdateApproval(user.id, 'approved')}
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-500 hover:bg-red-500/10"
                    onClick={() => onUpdateApproval(user.id, 'rejected')}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </>
              )}
              {user.approval_status === 'rejected' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                  onClick={() => onUpdateApproval(user.id, 'approved')}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
              )}
              {user.approval_status === 'approved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-muted-foreground hover:text-red-500"
                  onClick={() => onUpdateApproval(user.id, 'rejected')}
                  disabled={isUpdating}
                >
                  Revogar Acesso
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
