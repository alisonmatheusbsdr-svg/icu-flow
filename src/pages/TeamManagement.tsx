import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TeamUserManagement } from '@/components/team/TeamUserManagement';
import { PrintLogsManagement } from '@/components/admin/PrintLogsManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Printer, FileText, MonitorSmartphone } from 'lucide-react';
import { ActiveSessionsCard } from '@/components/admin/ActiveSessionsCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TermsContent } from '@/components/terms/TermsContent';

export default function TeamManagement() {
  const navigate = useNavigate();
  const { user, isLoading, rolesLoaded, hasRole, isApproved } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    // Only redirect after roles are loaded
    if (rolesLoaded && !hasRole('coordenador') && !hasRole('admin')) {
      navigate('/dashboard');
    }
  }, [rolesLoaded, hasRole, navigate]);

  // Check approval status
  useEffect(() => {
    if (rolesLoaded && !isApproved) {
      navigate('/dashboard');
    }
  }, [rolesLoaded, isApproved, navigate]);

  if (isLoading || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || (!hasRole('coordenador') && !hasRole('admin'))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Gestão</h1>
          <p className="text-muted-foreground">
            Gerencie sua equipe e acompanhe as impressões
          </p>
        </div>
        
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="prints" className="gap-2">
              <Printer className="h-4 w-4" />
              Impressões
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <MonitorSmartphone className="h-4 w-4" />
              Sessões
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <FileText className="h-4 w-4" />
              Termos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <TeamUserManagement />
          </TabsContent>

          <TabsContent value="prints">
            <PrintLogsManagement />
          </TabsContent>

          <TabsContent value="sessions">
            <ActiveSessionsCard />
          </TabsContent>

          <TabsContent value="terms">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Termos de Uso e Política de Privacidade Vigentes</h2>
              <ScrollArea className="max-h-[70vh]">
                <TermsContent />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
