import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, UserCheck, UserX, Clock, Loader2 } from 'lucide-react';
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

interface TeamUserCardProps {
  user: UserData;
  roleLabels: Record<string, string>;
  isUpdating: boolean;
  onUpdateApproval: (userId: string, status: ApprovalStatus) => void;
}

export function TeamUserCard({ user, roleLabels, isUpdating, onUpdateApproval }: TeamUserCardProps) {
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

  return (
    <Card className={isUpdating ? 'opacity-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{user.nome}</h3>
              {getStatusBadge(user.approval_status)}
            </div>
            <p className="text-sm text-muted-foreground">CRM: {user.crm}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2">
              {user.roles.length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {user.roles.map(r => roleLabels[r] || r).join(', ')}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Sem função atribuída</span>
              )}
            </div>
          </div>

          {isUpdating ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col gap-2">
              {user.approval_status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-500 hover:bg-green-500/10"
                    onClick={() => onUpdateApproval(user.id, 'approved')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-500 hover:bg-red-500/10"
                    onClick={() => onUpdateApproval(user.id, 'rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {user.approval_status === 'rejected' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:text-green-500 hover:bg-green-500/10"
                  onClick={() => onUpdateApproval(user.id, 'approved')}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {user.approval_status === 'approved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={() => onUpdateApproval(user.id, 'rejected')}
                >
                  Revogar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
