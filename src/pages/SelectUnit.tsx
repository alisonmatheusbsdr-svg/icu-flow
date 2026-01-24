import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Lock, Unlock, Users, LogOut, ArrowRightLeft, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnitWithStatus {
  id: string;
  name: string;
  bed_count: number;
  isOccupied: boolean;
  isInHandover: boolean;
  occupiedBy?: {
    nome: string;
    since: string;
  };
  sessionId?: string;
}

export default function SelectUnit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, isApproved, profile, signOut, hasRole, roles } = useAuth();
  const { units, isLoading: unitsLoading, startSession, activeSession, joinAsHandoverReceiver } = useUnit();
  const [unitsWithStatus, setUnitsWithStatus] = useState<UnitWithStatus[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState<string | null>(null);
  const [isReleasingSession, setIsReleasingSession] = useState<string | null>(null);
  const [isJoiningHandover, setIsJoiningHandover] = useState<string | null>(null);

  // Check if in assistencial mode (admin accessing UTI selector)
  const searchParams = new URLSearchParams(location.search);
  const isAssistencialMode = searchParams.get('mode') === 'assistencial';

  // Check if user can bypass unit selection (privileged roles)
  const canBypassSelection = hasRole('admin') || hasRole('coordenador') || hasRole('diarista');
  
  // Check if user is a plantonista (can join handover)
  const isPlantonista = hasRole('plantonista') && !canBypassSelection;

  // Redirect if already has active session or can bypass
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Redirect to dashboard if has active session
    if (!authLoading && !unitsLoading && activeSession) {
      navigate('/dashboard');
      return;
    }

    // Privileged users can go directly to dashboard without selecting a unit
    // Admin now goes directly to dashboard with Visão Geral (no longer needs assistencial mode)
    if (!authLoading && !unitsLoading && canBypassSelection && !activeSession) {
      navigate('/dashboard');
    }
  }, [user, authLoading, unitsLoading, activeSession, canBypassSelection, isAssistencialMode, navigate]);

  // Fetch unit occupancy status
  useEffect(() => {
    if (units.length === 0 || !isApproved) return;

    const fetchUnitStatus = async () => {
      setIsLoadingStatus(true);
      
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: sessions, error } = await supabase
        .from('active_sessions')
        .select('id, unit_id, user_id, started_at, is_blocking, handover_mode')
        .eq('is_blocking', true)
        .gt('last_activity', thirtyMinutesAgo);

      if (error) {
        console.error('Error fetching sessions:', error);
        setIsLoadingStatus(false);
        return;
      }

      // Fetch profile names for occupied units
      const userIds = sessions?.map(s => s.user_id) || [];
      let profiles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p.nome;
          return acc;
        }, {} as Record<string, string>);
      }

      const statusMap = (sessions || []).reduce((acc, session) => {
        acc[session.unit_id] = {
          isOccupied: true,
          isInHandover: session.handover_mode || false,
          occupiedBy: {
            nome: profiles[session.user_id] || 'Usuário',
            since: session.started_at
          },
          sessionId: session.id
        };
        return acc;
      }, {} as Record<string, { isOccupied: boolean; isInHandover: boolean; occupiedBy?: { nome: string; since: string }; sessionId?: string }>);

      const enrichedUnits = units.map(unit => ({
        ...unit,
        isOccupied: statusMap[unit.id]?.isOccupied || false,
        isInHandover: statusMap[unit.id]?.isInHandover || false,
        occupiedBy: statusMap[unit.id]?.occupiedBy,
        sessionId: statusMap[unit.id]?.sessionId
      }));

      setUnitsWithStatus(enrichedUnits);
      setIsLoadingStatus(false);
    };

    fetchUnitStatus();

    // Set up realtime subscription for session changes
    const channel = supabase
      .channel('active_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        () => {
          fetchUnitStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [units, isApproved]);

  const handleSelectUnit = async (unit: UnitWithStatus) => {
    if (unit.isOccupied && !canBypassSelection && !unit.isInHandover) {
      toast.error('Esta UTI está ocupada. Aguarde o plantonista atual fazer logout.');
      return;
    }

    setIsStartingSession(unit.id);
    
    const result = await startSession(unit.id);
    
    if (result.error) {
      toast.error(result.error);
      setIsStartingSession(null);
      return;
    }

    toast.success(`Sessão iniciada na ${unit.name}`);
    navigate('/dashboard');
  };

  const handleJoinHandover = async (unit: UnitWithStatus) => {
    setIsJoiningHandover(unit.id);
    
    const result = await joinAsHandoverReceiver(unit.id);
    
    if (result.error) {
      toast.error(result.error);
      setIsJoiningHandover(null);
      return;
    }

    toast.success(`Entrando em modo visualização na ${unit.name}`);
    navigate('/dashboard');
  };

  const handleReleaseUnit = async (sessionId: string, unitName: string) => {
    setIsReleasingSession(sessionId);
    
    const { error } = await supabase
      .from('active_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast.error('Erro ao liberar a UTI');
      console.error('Error releasing session:', error);
    } else {
      toast.success(`${unitName} liberada com sucesso`);
    }
    
    setIsReleasingSession(null);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || unitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isApproved) {
    return null;
  }

  const canRelease = hasRole('admin') || hasRole('coordenador');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">UTI Handoff Pro</h1>
              <p className="text-sm text-muted-foreground">Selecione a UTI para este plantão</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.nome}</p>
              <p className="text-xs text-muted-foreground">
                {roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {isAssistencialMode ? 'Acesso Assistencial' : 'Escolha sua UTI'}
            </h2>
            <p className="text-muted-foreground">
              {isAssistencialMode 
                ? 'Selecione a UTI para acessar o painel assistencial.'
                : canBypassSelection 
                  ? 'Você pode acessar qualquer UTI sem bloquear outros usuários.'
                  : 'Você ficará exclusivo nesta UTI até fazer logout.'}
            </p>
          </div>

          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : unitsWithStatus.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma UTI disponível para você.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre em contato com o administrador para ter acesso a uma UTI.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unitsWithStatus.map(unit => (
                <Card 
                  key={unit.id} 
                  className={`transition-all ${
                    unit.isOccupied && !canBypassSelection && !unit.isInHandover
                      ? 'opacity-60' 
                      : 'hover:border-primary cursor-pointer'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {unit.bed_count} leitos
                        </CardDescription>
                      </div>
                      {unit.isInHandover ? (
                        <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300">
                          <ArrowRightLeft className="h-3 w-3" />
                          Em Passagem
                        </Badge>
                      ) : unit.isOccupied ? (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Ocupada
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Unlock className="h-3 w-3" />
                          Disponível
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {unit.isOccupied && unit.occupiedBy ? (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <p className="font-medium">{unit.occupiedBy.nome}</p>
                          <p className="text-muted-foreground">
                            Desde {formatDistanceToNow(new Date(unit.occupiedBy.since), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* Show join handover button for plantonistas when unit is in handover mode */}
                          {unit.isInHandover && isPlantonista && (
                            <Button 
                              className="w-full gap-2"
                              disabled={isJoiningHandover === unit.id}
                              onClick={() => handleJoinHandover(unit)}
                            >
                              {isJoiningHandover === unit.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                              Entrar para Receber Plantão
                            </Button>
                          )}
                          
                          <div className="flex gap-2">
                            {canRelease && (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="flex-1"
                                disabled={isReleasingSession === unit.sessionId}
                                onClick={() => handleReleaseUnit(unit.sessionId!, unit.name)}
                              >
                                {isReleasingSession === unit.sessionId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Liberar UTI'
                                )}
                              </Button>
                            )}
                            {canBypassSelection && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                disabled={isStartingSession === unit.id}
                                onClick={() => handleSelectUnit(unit)}
                              >
                                {isStartingSession === unit.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Entrar assim mesmo'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        disabled={isStartingSession === unit.id}
                        onClick={() => handleSelectUnit(unit)}
                      >
                        {isStartingSession === unit.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Entrar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!canBypassSelection && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                ⚠️ A sessão será automaticamente liberada após <strong>30 minutos de inatividade</strong>.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
