import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TeamUserManagement } from '@/components/team/TeamUserManagement';

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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Equipe</h1>
          <p className="text-muted-foreground">
            Aprove ou rejeite cadastros de plantonistas e diaristas
          </p>
        </div>
        <TeamUserManagement />
      </main>
    </div>
  );
}
