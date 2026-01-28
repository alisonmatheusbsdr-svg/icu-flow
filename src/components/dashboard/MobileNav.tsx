import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  LogOut, 
  Settings, 
  User, 
  Lock, 
  Clock, 
  Stethoscope, 
  Building2, 
  LayoutGrid,
  UserCheck,
  Eye,
  ArrowRightLeft,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface UnitBasic {
  id: string;
  name: string;
}

interface ActiveSessionBasic {
  is_blocking: boolean;
  handover_mode: boolean;
  is_handover_receiver: boolean;
  last_activity: string;
}

interface MobileNavProps {
  units: UnitBasic[];
  selectedUnit: UnitBasic | null;
  showAllUnits: boolean;
  canSwitchUnits: boolean;
  canViewAllUnits: boolean;
  activeSession: ActiveSessionBasic | null;
  isInHandoverMode: boolean;
  isHandoverReceiver: boolean;
  timeRemaining: { text: string; isUrgent: boolean } | null;
  onSelectUnit: (unit: UnitBasic) => void;
  onSelectAllUnits: () => void;
  onStartHandover: () => void;
  onEndHandover: () => void;
  onAssumeShift: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  isHandoverLoading: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  diarista: 'Diarista',
  plantonista: 'Plantonista',
  coordenador: 'Coordenador'
};

export function MobileNav({
  units,
  selectedUnit,
  showAllUnits,
  canSwitchUnits,
  canViewAllUnits,
  activeSession,
  isInHandoverMode,
  isHandoverReceiver,
  timeRemaining,
  onSelectUnit,
  onSelectAllUnits,
  onStartHandover,
  onEndHandover,
  onAssumeShift,
  onOpenProfile,
  onLogout,
  isHandoverLoading
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, roles, hasRole } = useAuth();
  
  const isOnAdmin = location.pathname === '/admin';
  const showHandoverControls = activeSession?.is_blocking && !canSwitchUnits;

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <span className="font-semibold">Sinapse | UTI</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col min-h-[calc(100vh-60px)]">
          {/* User Info */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {roles.map(r => roleLabels[r]).join(', ')}
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {activeSession && timeRemaining && !isHandoverReceiver && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1.5 text-xs",
                    timeRemaining.isUrgent 
                      ? "border-destructive text-destructive animate-pulse" 
                      : "text-muted-foreground"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {timeRemaining.text}
                </Badge>
              )}
              {isHandoverReceiver && (
                <Badge 
                  variant="outline" 
                  className="gap-1.5 text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950"
                >
                  <Eye className="h-3 w-3" />
                  Visualizando
                </Badge>
              )}
              {isInHandoverMode && !isHandoverReceiver && (
                <Badge 
                  variant="outline" 
                  className="gap-1.5 text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 animate-pulse"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Em Passagem
                </Badge>
              )}
            </div>
          </div>

          {/* Unit Selection */}
          {units.length > 0 && !isOnAdmin && (
            <div className="p-4 border-b">
              <p className="text-xs font-medium text-muted-foreground mb-2">Unidade</p>
              {canSwitchUnits ? (
                <Select 
                  value={showAllUnits ? 'all' : selectedUnit?.id || ''} 
                  onValueChange={(id) => {
                    if (id === 'all') {
                      onSelectAllUnits();
                    } else {
                      const unit = units.find(u => u.id === id);
                      if (unit) onSelectUnit(unit);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a UTI" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Lock className="h-3 w-3" />
                  {selectedUnit.name}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Handover controls */}
            {showHandoverControls && !isInHandoverMode && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => { onStartHandover(); setIsOpen(false); }}
                disabled={isHandoverLoading}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Liberar para Passagem
              </Button>
            )}

            {showHandoverControls && isInHandoverMode && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-destructive text-destructive"
                onClick={() => { onEndHandover(); setIsOpen(false); }}
                disabled={isHandoverLoading}
              >
                <XCircle className="h-4 w-4" />
                Encerrar Passagem
              </Button>
            )}

            {isHandoverReceiver && (
              <Button 
                className="w-full justify-start gap-2"
                onClick={() => { onAssumeShift(); setIsOpen(false); }}
                disabled={isHandoverLoading}
              >
                <UserCheck className="h-4 w-4" />
                Assumir Plantão
              </Button>
            )}

            <Separator className="my-3" />

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={() => { onOpenProfile(); setIsOpen(false); }}
            >
              <User className="h-4 w-4" />
              Meu Perfil
            </Button>

            {isOnAdmin && hasRole('admin') && (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => handleNavigation('/dashboard')}
              >
                <Stethoscope className="h-4 w-4" />
                Acesso Assistencial
              </Button>
            )}

            {!isOnAdmin && hasRole('admin') && (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => handleNavigation('/admin')}
              >
                <Settings className="h-4 w-4" />
                Administração
              </Button>
            )}
          </div>

          {/* Logout */}
          <div className="p-4 border-t mt-auto">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
