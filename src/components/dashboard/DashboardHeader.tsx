import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, LogOut, Settings, Printer, Home, Lock, Clock, Stethoscope } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const { units, selectedUnit, selectUnit, canSwitchUnits, activeSession } = useUnit();
  const [timeRemaining, setTimeRemaining] = useState<{ text: string; isUrgent: boolean } | null>(null);
  
  const isOnAdmin = location.pathname === '/admin';

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
            <span className="font-semibold text-foreground">UTI Handoff Pro</span>
          </button>

          {/* Show dropdown for privileged users, fixed badge for plantonistas */}
          {units.length > 0 && (
            canSwitchUnits ? (
              <Select value={selectedUnit?.id} onValueChange={(id) => {
                const unit = units.find(u => u.id === id);
                if (unit) selectUnit(unit);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione a UTI" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
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
          {activeSession && timeRemaining && (
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
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>

          {isOnAdmin && hasRole('admin') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/select-unit?mode=assistencial')} className="gap-2">
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
    </header>
  );
}