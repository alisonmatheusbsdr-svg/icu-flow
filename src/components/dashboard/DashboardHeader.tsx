import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, User, Lock, Clock, Stethoscope, Building2, LayoutGrid, UserCheck, Eye, ArrowRightLeft, XCircle, Users } from 'lucide-react';
import { SinapseLogo } from '@/components/SinapseLogo';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { getUnsavedDraftsForUnit, type UnsavedDraft } from '@/lib/draft-utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function formatTimeRemaining(lastActivity: string): { text: string; isUrgent: boolean } {
  const lastActivityTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const elapsedMs = now - lastActivityTime;
  const remainingMs = INACTIVITY_TIMEOUT_MS - elapsedMs;
  
  if (remainingMs <= 0) {
    return { text: 'Expirado', isUrgent: true };
  }
  
  const minutes = Math.ceil(remainingMs / (1000 * 60));
  const isUrgent = minutes <= 5;
  
  return { text: `${minutes}min`, isUrgent };
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  diarista: 'Diarista',
  plantonista: 'Plantonista',
  coordenador: 'Coordenador'
};

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { profile, roles, signOut, hasRole } = useAuth();
  const { 
    units, 
    selectedUnit, 
    selectUnit, 
    canSwitchUnits, 
    activeSession, 
    showAllUnits, 
    selectAllUnits,
    isInHandoverMode,
    isHandoverReceiver,
    startHandoverMode,
    endHandoverMode,
    assumeShift,
    cleanupSession
  } = useUnit();
  const [timeRemaining, setTimeRemaining] = useState<{ text: string; isUrgent: boolean } | null>(null);
  const [isHandoverLoading, setIsHandoverLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<UnsavedDraft[]>([]);
  
  const canViewAllUnits = hasRole('coordenador') || hasRole('diarista') || hasRole('admin');
  const isOnAdmin = location.pathname === '/admin';
  const isOnTeamPage = location.pathname === '/equipe';
  
  // Only admins can switch between units - coordinators/diaristas always see "Visão Geral"
  const showUnitDropdown = hasRole('admin') && !isOnAdmin && !isOnTeamPage;
  
  // Show handover buttons only for plantonistas with blocking sessions
  const showHandoverControls = activeSession?.is_blocking && !canSwitchUnits;

  // Update countdown every 30 seconds
  useEffect(() => {
    if (!activeSession?.last_activity) {
      setTimeRemaining(null);
      return;
    }

    // Initial update
    setTimeRemaining(formatTimeRemaining(activeSession.last_activity));

    // Update every 30 seconds for precision
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(activeSession.last_activity));
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [activeSession?.last_activity]);

  const executeLogout = async () => {
    await cleanupSession();
    await signOut();
    navigate('/auth');
  };

  const handleLogout = async () => {
    if (selectedUnit) {
      const drafts = await getUnsavedDraftsForUnit(selectedUnit.id);
      if (drafts.length > 0) {
        setPendingDrafts(drafts);
        setShowDraftAlert(true);
        return;
      }
    }
    await executeLogout();
  };

  const handleStartHandover = async () => {
    setIsHandoverLoading(true);
    await startHandoverMode();
    toast.success('Modo de passagem ativado. Outro plantonista pode entrar para visualizar.');
    setIsHandoverLoading(false);
  };

  const handleEndHandover = async () => {
    setIsHandoverLoading(true);
    await endHandoverMode();
    toast.success('Modo de passagem encerrado.');
    setIsHandoverLoading(false);
  };

  const handleAssumeShift = async () => {
    setIsHandoverLoading(true);
    await assumeShift();
    toast.success('Plantão assumido com sucesso!');
    setIsHandoverLoading(false);
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Nav */}
          <MobileNav
            units={units}
            selectedUnit={selectedUnit}
            showAllUnits={showAllUnits}
            canSwitchUnits={canSwitchUnits}
            canViewAllUnits={canViewAllUnits}
            activeSession={activeSession}
            isInHandoverMode={isInHandoverMode}
            isHandoverReceiver={isHandoverReceiver}
            timeRemaining={timeRemaining}
            onSelectUnit={selectUnit}
            onSelectAllUnits={selectAllUnits}
            onStartHandover={handleStartHandover}
            onEndHandover={handleEndHandover}
            onAssumeShift={handleAssumeShift}
            onOpenProfile={() => setIsProfileOpen(true)}
            onLogout={handleLogout}
            isHandoverLoading={isHandoverLoading}
          />

          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <SinapseLogo size="sm" />
            <span className="font-semibold text-foreground hidden sm:inline">Sinapse | UTI</span>
          </button>

          {/* Unit selector logic - hide on admin/team pages and mobile */}
          {units.length > 0 && !isOnAdmin && !isOnTeamPage && !isMobile && (
            showUnitDropdown ? (
              // Admin gets the full dropdown
              <Select 
                value={showAllUnits ? 'all' : selectedUnit?.id || ''} 
                onValueChange={(id) => {
                  if (id === 'all') {
                    selectAllUnits();
                  } else {
                    const unit = units.find(u => u.id === id);
                    if (unit) selectUnit(unit);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione a UTI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Visão Geral
                    </div>
                  </SelectItem>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {unit.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : canViewAllUnits && !hasRole('admin') ? (
              // Coordinators/Diaristas get a fixed "Visão Geral" badge
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                <LayoutGrid className="h-3 w-3" />
                Visão Geral
              </Badge>
            ) : selectedUnit && (
              // Plantonistas get their locked unit badge
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                <Lock className="h-3 w-3" />
                {selectedUnit.name}
              </Badge>
            )
          )}

          {/* Inactivity countdown indicator - desktop only */}
          {!isMobile && activeSession && timeRemaining && !isHandoverReceiver && (
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 px-2.5 py-1 text-xs font-normal transition-colors",
                timeRemaining.isUrgent 
                  ? "border-destructive text-destructive animate-pulse" 
                  : "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {timeRemaining.text}
            </Badge>
          )}

          {/* Handover mode indicator for receiver - desktop only */}
          {!isMobile && isHandoverReceiver && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 text-xs font-normal border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950"
            >
              <Eye className="h-3 w-3" />
              Visualizando
            </Badge>
          )}

          {/* Handover mode indicator for active plantonista - desktop only */}
          {!isMobile && isInHandoverMode && !isHandoverReceiver && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 text-xs font-normal border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 animate-pulse"
            >
              <ArrowRightLeft className="h-3 w-3" />
              Em Passagem
            </Badge>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Handover controls for plantonista */}
          {showHandoverControls && !isInHandoverMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleStartHandover}
              disabled={isHandoverLoading}
              className="gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Liberar para Passagem
            </Button>
          )}

          {showHandoverControls && isInHandoverMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEndHandover}
              disabled={isHandoverLoading}
              className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <XCircle className="h-4 w-4" />
              Encerrar Passagem
            </Button>
          )}

          {/* Assume shift button for receiver */}
          {isHandoverReceiver && (
            <Button 
              size="sm" 
              onClick={handleAssumeShift}
              disabled={isHandoverLoading}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Assumir Plantão
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="h-4 w-4" />
            Perfil
          </Button>

          {isOnAdmin && hasRole('admin') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
              <Stethoscope className="h-4 w-4" />
              Acesso Assistencial
            </Button>
          )}

          {!isOnAdmin && !isOnTeamPage && hasRole('admin') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </Button>
          )}

          {/* Team management button for coordinators (not admins, they have full admin access) */}
          {!isOnAdmin && !isOnTeamPage && hasRole('coordenador') && !hasRole('admin') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/equipe')} className="gap-2">
              <Users className="h-4 w-4" />
              Gestão
            </Button>
          )}

          {/* Back to dashboard button when on team page */}
          {isOnTeamPage && (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
              <Stethoscope className="h-4 w-4" />
              Acesso Assistencial
            </Button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
            <span className="text-sm font-medium">{profile?.nome}</span>
            <span className="text-xs text-muted-foreground">
              ({roles.map(r => roleLabels[r]).join(', ')})
            </span>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />

      <AlertDialog open={showDraftAlert} onOpenChange={setShowDraftAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Evoluções não validadas</AlertDialogTitle>
            <AlertDialogDescription>
              Você possui rascunhos de evolução em {pendingDrafts.length} paciente(s) que não foram validados ({pendingDrafts.map(d => d.initials).join(', ')}). Se sair, esses rascunhos serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setShowDraftAlert(false);
                await executeLogout();
              }}
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
