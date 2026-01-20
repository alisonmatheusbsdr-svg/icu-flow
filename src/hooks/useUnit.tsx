import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
}

interface ActiveSession {
  id: string;
  user_id: string;
  unit_id: string;
  started_at: string;
  last_activity: string;
  is_blocking: boolean;
}

interface UnitContextType {
  units: Unit[];
  selectedUnit: Unit | null;
  isLoading: boolean;
  activeSession: ActiveSession | null;
  isSessionBlocking: boolean;
  canSwitchUnits: boolean;
  selectUnit: (unit: Unit) => void;
  refreshUnits: () => Promise<void>;
  startSession: (unitId: string) => Promise<{ error: string | null }>;
  endSession: () => Promise<void>;
  updateActivity: () => Promise<void>;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PRIVILEGED_ROLES = ['admin', 'coordenador', 'diarista'];

export function UnitProvider({ children }: { children: ReactNode }) {
  const { user, isApproved, roles, rolesLoaded } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has privileged role (can switch units, doesn't block)
  // Only evaluate after roles are loaded to prevent incorrect defaults
  const canSwitchUnits = rolesLoaded && roles.some(r => PRIVILEGED_ROLES.includes(r));
  const isSessionBlocking = activeSession?.is_blocking ?? false;

  // Fetch units
  const fetchUnits = useCallback(async () => {
    if (!user || !isApproved) {
      setUnits([]);
      setSelectedUnit(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name');

    if (!error && data) {
      setUnits(data);
    }
    setIsLoading(false);
  }, [user, isApproved]);

  // Fetch active session for current user
  const fetchActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      return;
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gt('last_activity', thirtyMinutesAgo)
      .maybeSingle();

    if (!error && data) {
      setActiveSession(data as ActiveSession);
      
      // Also set the selected unit based on active session
      const unit = units.find(u => u.id === data.unit_id);
      if (unit) {
        setSelectedUnit(unit);
      }
    } else {
      setActiveSession(null);
    }
  }, [user, units]);

  // Initial load
  useEffect(() => {
    if (user && isApproved) {
      fetchUnits();
    } else {
      setUnits([]);
      setSelectedUnit(null);
      setActiveSession(null);
      setIsLoading(false);
    }
  }, [user, isApproved, fetchUnits]);

  // Fetch session after units are loaded
  useEffect(() => {
    if (units.length > 0 && user) {
      fetchActiveSession();
    }
  }, [units, user, fetchActiveSession]);

  // Heartbeat - update activity every 5 minutes
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      updateActivity();
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Start a new session
  const startSession = async (unitId: string): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    // Determine if this session should block (plantonistas block, privileged don't)
    const shouldBlock = !canSwitchUnits;

    // Check if unit is available (only for blocking sessions)
    if (shouldBlock) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: existingSession } = await supabase
        .from('active_sessions')
        .select('id')
        .eq('unit_id', unitId)
        .eq('is_blocking', true)
        .gt('last_activity', thirtyMinutesAgo)
        .maybeSingle();

      if (existingSession) {
        return { error: 'Esta UTI já está ocupada por outro plantonista' };
      }
    }

    // Delete any existing session for this user
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id);

    // Create new session
    const { data, error } = await supabase
      .from('active_sessions')
      .insert({
        user_id: user.id,
        unit_id: unitId,
        is_blocking: shouldBlock
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      
      // Check if it's a unique constraint violation (race condition)
      if (error.code === '23505') {
        return { error: 'Esta UTI acabou de ser ocupada por outro plantonista' };
      }
      
      return { error: 'Erro ao iniciar sessão' };
    }

    setActiveSession(data as ActiveSession);
    
    // Set selected unit
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
    }

    return { error: null };
  };

  // End current session
  const endSession = async () => {
    if (!activeSession) return;

    await supabase
      .from('active_sessions')
      .delete()
      .eq('id', activeSession.id);

    setActiveSession(null);
    setSelectedUnit(null);
  };

  // Update activity timestamp (heartbeat)
  const updateActivity = async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from('active_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error updating activity:', error);
    }
  };

  // Select unit (for privileged users who can switch)
  const selectUnit = (unit: Unit) => {
    if (canSwitchUnits) {
      setSelectedUnit(unit);
      // Also start/update session for this unit
      startSession(unit.id);
    }
  };

  const refreshUnits = async () => {
    await fetchUnits();
  };

  return (
    <UnitContext.Provider value={{
      units,
      selectedUnit,
      isLoading: isLoading || !rolesLoaded,
      activeSession,
      isSessionBlocking,
      canSwitchUnits,
      selectUnit,
      refreshUnits,
      startSession,
      endSession,
      updateActivity
    }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
