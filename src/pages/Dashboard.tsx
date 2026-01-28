import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { BedGrid } from '@/components/dashboard/BedGrid';
import { AllUnitsGrid } from '@/components/dashboard/AllUnitsGrid';
import { NIRDashboard } from '@/components/nir/NIRDashboard';
import { PendingApproval } from '@/components/dashboard/PendingApproval';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye } from 'lucide-react';

const ACTIVITY_DEBOUNCE_MS = 60 * 1000; // 1 minute debounce

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isApproved, profile, hasRole } = useAuth();
  const { selectedUnit, isLoading: unitLoading, activeSession, canSwitchUnits, updateActivity, showAllUnits, isHandoverReceiver, isNIR } = useUnit();
  const lastActivityUpdate = useRef<number>(0);

  // Check if user can view all units (coordinators and diaristas)
  const canViewAllUnits = hasRole('coordenador') || hasRole('diarista') || hasRole('admin');

  // Check if user needs to select a unit first (plantonistas without active session)
  const needsUnitSelection = !activeSession && !canSwitchUnits;

  // Debounced activity handler
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityUpdate.current >= ACTIVITY_DEBOUNCE_MS) {
      lastActivityUpdate.current = now;
      updateActivity();
    }
  }, [updateActivity]);

  // Listen for user activity to reset inactivity countdown
  useEffect(() => {
    if (!activeSession) return;

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [activeSession, handleUserActivity]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Redirect plantonistas without active session to unit selection
    // Coordinators can see all units, so they don't need to select
    if (!authLoading && !unitLoading && isApproved && needsUnitSelection && !canViewAllUnits) {
      navigate('/select-unit');
    }
  }, [user, authLoading, unitLoading, isApproved, needsUnitSelection, canViewAllUnits, navigate]);

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

  // Redirect plantonistas to unit selection (except coordinators and diaristas)
  if (needsUnitSelection && !canViewAllUnits) {
    return null;
  }

  // Determine what to render in the main area
  const renderMainContent = () => {
    // NIR users get their special dashboard
    if (isNIR && (showAllUnits || !selectedUnit)) {
      return <NIRDashboard />;
    }

    // If coordinator/diarista and showing all units (or no unit selected)
    if (canViewAllUnits && (showAllUnits || !selectedUnit)) {
      return <AllUnitsGrid />;
    }

    // If a specific unit is selected
    if (selectedUnit) {
      return <BedGrid unitId={selectedUnit.id} unitName={selectedUnit.name} bedCount={selectedUnit.bed_count} />;
    }

    // Fallback: no units available
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma unidade disponível.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Entre em contato com o administrador para ter acesso a uma UTI.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        {/* Handover receiver banner */}
        {isHandoverReceiver && (
          <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <Eye className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Modo Visualização:</strong> Você está recebendo o plantão. Os dados são apenas para leitura. 
              Clique em <strong>"Assumir Plantão"</strong> no cabeçalho quando estiver pronto para começar a editar.
            </AlertDescription>
          </Alert>
        )}
        
        {renderMainContent()}
      </main>
    </div>
  );
}
