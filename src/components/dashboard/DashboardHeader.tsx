import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, LogOut, Settings, User, Lock, Clock, Stethoscope, Building2, LayoutGrid, UserCheck, Eye, ArrowRightLeft, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProfileDialog } from '@/components/profile/ProfileDialog';

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

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
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
    assumeShift
  } = useUnit();
  const [timeRemaining, setTimeRemaining] = useState<{ text: string; isUrgent: boolean } | null>(null);
  const [isHandoverLoading, setIsHandoverLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const canViewAllUnits = hasRole('coordenador') || hasRole('diarista') || hasRole('admin');
  const isOnAdmin = location.pathname === '/admin';
  
  // Show handover buttons only for plantonistas with blocking sessions
  const showHandoverControls = activeSession?.is_blocking && !canSwitchUnits;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    diarista: 'Diarista',
    plantonista: 'Plantonista',
    coordenador: 'Coordenador'
  };

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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="p-1.5 bg-primary rounded-lg">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Sinapse | UTI</span>
          </button>

          {/* Show dropdown for privileged users, fixed badge for plantonistas - hide on admin page */}
          {units.length > 0 && !isOnAdmin && (
            canSwitchUnits ? (
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
                  {/* Coordinators and diaristas can see all units at once */}
                  {canViewAllUnits && (
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Visão Geral
                      </div>
                    </SelectItem>
                  )}
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
            ) : selectedUnit && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                <Lock className="h-3 w-3" />
                {selectedUnit.name}
              </Badge>
            )
          )}

          {/* Inactivity countdown indicator */}
          {activeSession && timeRemaining && !isHandoverReceiver && (
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

          {/* Handover mode indicator for receiver */}
          {isHandoverReceiver && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 text-xs font-normal border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950"
            >
              <Eye className="h-3 w-3" />
              Visualizando
            </Badge>
          )}

          {/* Handover mode indicator for active plantonista */}
          {isInHandoverMode && !isHandoverReceiver && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 text-xs font-normal border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 animate-pulse"
            >
              <ArrowRightLeft className="h-3 w-3" />
              Em Passagem
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
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

          {!isOnAdmin && hasRole('admin') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-2">
              <Settings className="h-4 w-4" />
              Admin
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
    </header>
  );
}
