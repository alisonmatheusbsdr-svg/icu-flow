import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Activity } from 'lucide-react';
interface Profile {
  id: string;
  nome: string;
  crm: string;
  approval_status: string;
}

interface PendingApprovalProps {
  profile: Profile | null;
}

export function PendingApproval({ profile }: PendingApprovalProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-warning/10 rounded-full w-fit">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle>Aguardando Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Olá, <strong>{profile?.nome}</strong>! Seu cadastro foi recebido e está aguardando aprovação de um administrador.
          </p>
          <p className="text-sm text-muted-foreground">
            Você receberá acesso ao sistema assim que sua conta for aprovada.
          </p>
          <Button variant="outline" onClick={signOut} className="mt-4">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}