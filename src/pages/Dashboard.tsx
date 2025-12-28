import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BedGrid } from '@/components/dashboard/BedGrid';
import { PendingApproval } from '@/components/dashboard/PendingApproval';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isApproved, profile } = useAuth();
  const { selectedUnit, isLoading: unitLoading } = useUnit();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || unitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show pending approval screen
  if (!isApproved) {
    return <PendingApproval profile={profile} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        {selectedUnit ? (
          <BedGrid unitId={selectedUnit.id} unitName={selectedUnit.name} bedCount={selectedUnit.bed_count} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma unidade disponível.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Entre em contato com o administrador para ter acesso a uma UTI.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}