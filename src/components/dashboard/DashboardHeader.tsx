import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, LogOut, Settings, Printer, Home, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, roles, signOut, hasRole } = useAuth();
  const { units, selectedUnit, selectUnit, canSwitchUnits, activeSession } = useUnit();
  
  const isOnAdmin = location.pathname === '/admin';

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    diarista: 'Diarista',
    plantonista: 'Plantonista',
    coordenador: 'Coordenador'
  };

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
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>

          {isOnAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
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