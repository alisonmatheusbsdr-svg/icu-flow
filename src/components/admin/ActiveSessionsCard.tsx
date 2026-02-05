import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, LogOut, MonitorSmartphone, RefreshCw, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActiveSession {
  id: string;
  user_id: string;
  unit_id: string;
  started_at: string;
  last_activity: string;
  is_blocking: boolean;
  handover_mode: boolean;
  is_handover_receiver: boolean;
  user_name: string;
  unit_name: string;
}

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

export function ActiveSessionsCard() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('id, user_id, unit_id, started_at, last_activity, is_blocking, handover_mode, is_handover_receiver');

      if (error) throw error;

      if (!data || data.length === 0) {
        setSessions([]);
        return;
      }

      // Fetch profiles and units in parallel
      const userIds = [...new Set(data.map(s => s.user_id))];
      const unitIds = [...new Set(data.map(s => s.unit_id))];

      const [profilesRes, unitsRes] = await Promise.all([
        supabase.from('profiles').select('id, nome').in('id', userIds),
        supabase.from('units').select('id, name').in('id', unitIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.nome]));
      const unitMap = new Map((unitsRes.data || []).map(u => [u.id, u.name]));

      const now = Date.now();
      const activeSessions: ActiveSession[] = data
        .filter(s => now - new Date(s.last_activity).getTime() < INACTIVITY_LIMIT_MS)
        .map(s => ({
          ...s,
          user_name: profileMap.get(s.user_id) || 'Usuário desconhecido',
          unit_name: unitMap.get(s.unit_id) || 'Unidade desconhecida',
        }))
        .sort((a, b) => a.unit_name.localeCompare(b.unit_name));

      setSessions(activeSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erro ao carregar sessões ativas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('active-sessions-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDisconnect = async (session: ActiveSession) => {
    setDisconnectingId(session.id);
    try {
      const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;

      toast.success(`${session.user_name} desconectado de ${session.unit_name}`);
      setSessions(prev => prev.filter(s => s.id !== session.id));
    } catch (error) {
      console.error('Error disconnecting session:', error);
      toast.error('Erro ao desconectar sessão');
    } finally {
      setDisconnectingId(null);
    }
  };

  const getStatusBadge = (session: ActiveSession) => {
    if (session.handover_mode && session.is_handover_receiver) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Recebendo plantão</Badge>;
    }
    if (session.handover_mode) {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Passando plantão</Badge>;
    }
    if (session.is_blocking) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Visualizando</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorSmartphone className="h-5 w-5" />
          Sessões Ativas
          {sessions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{sessions.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma sessão ativa no momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{session.user_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{session.unit_name}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.started_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(session)}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        disabled={disconnectingId === session.id}
                      >
                        {disconnectingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desconectar Usuário</AlertDialogTitle>
                        <AlertDialogDescription>
                          Desconectar <strong>{session.user_name}</strong> da unidade <strong>{session.unit_name}</strong>?
                          O usuário perderá acesso aos dados da unidade até iniciar uma nova sessão.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect(session)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Desconectar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
