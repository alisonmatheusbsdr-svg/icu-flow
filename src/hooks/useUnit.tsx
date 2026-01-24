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
  handover_mode: boolean;
  is_handover_receiver: boolean;
}

interface UnitContextType {
  units: Unit[];
  selectedUnit: Unit | null;
  isLoading: boolean;
  activeSession: ActiveSession | null;
  isSessionBlocking: boolean;
  canSwitchUnits: boolean;
  showAllUnits: boolean;
  isInHandoverMode: boolean;
  isHandoverReceiver: boolean;
  canEdit: boolean;
  selectUnit: (unit: Unit) => void;
  selectAllUnits: () => void;
  refreshUnits: () => Promise<void>;
  startSession: (unitId: string) => Promise<{ error: string | null }>;
  endSession: () => Promise<void>;
  updateActivity: () => Promise<void>;
  startHandoverMode: () => Promise<void>;
  endHandoverMode: () => Promise<void>;
  joinAsHandoverReceiver: (unitId: string) => Promise<{ error: string | null }>;
  assumeShift: () => Promise<void>;
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
  const [showAllUnits, setShowAllUnits] = useState(false);

  // Check if user has privileged role (can switch units, doesn't block)
  // Only evaluate after roles are loaded to prevent incorrect defaults
  const canSwitchUnits = rolesLoaded && roles.some(r => PRIVILEGED_ROLES.includes(r));
  const isSessionBlocking = activeSession?.is_blocking ?? false;
  
  // Check if user can view all units at once (coordinators and diaristas)
  const canViewAllUnits = rolesLoaded && (roles.includes('coordenador') || roles.includes('diarista'));

  // Handover mode states
  const isInHandoverMode = activeSession?.handover_mode ?? false;
  const isHandoverReceiver = activeSession?.is_handover_receiver ?? false;
  
  // Can edit: true unless user is a handover receiver
  const canEdit = !isHandoverReceiver;

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
        .select('id, handover_mode')
        .eq('unit_id', unitId)
        .eq('is_blocking', true)
        .gt('last_activity', thirtyMinutesAgo)
        .maybeSingle();

      if (existingSession && !existingSession.handover_mode) {
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
  const updateActivity = useCallback(async () => {
    if (!activeSession) return;

    const newTimestamp = new Date().toISOString();

    const { error } = await supabase
      .from('active_sessions')
      .update({ last_activity: newTimestamp })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error updating activity:', error);
    } else {
      // Update local state immediately for UI responsiveness
      setActiveSession(prev => prev ? { ...prev, last_activity: newTimestamp } : null);
    }
  }, [activeSession]);

  // Start handover mode - allows a second plantonista to view
  const startHandoverMode = async () => {
    if (!activeSession || !activeSession.is_blocking) return;

    const { error } = await supabase
      .from('active_sessions')
      .update({ handover_mode: true })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error starting handover mode:', error);
    } else {
      setActiveSession(prev => prev ? { ...prev, handover_mode: true } : null);
    }
  };

  // End handover mode and remove any receiver sessions
  const endHandoverMode = async () => {
    if (!activeSession) return;

    // First, delete any receiver sessions for this unit
    await supabase
      .from('active_sessions')
      .delete()
      .eq('unit_id', activeSession.unit_id)
      .eq('is_handover_receiver', true);

    // Then update our session to exit handover mode
    const { error } = await supabase
      .from('active_sessions')
      .update({ handover_mode: false })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error ending handover mode:', error);
    } else {
      setActiveSession(prev => prev ? { ...prev, handover_mode: false } : null);
    }
  };

  // Join as handover receiver (view-only mode)
  const joinAsHandoverReceiver = async (unitId: string): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Check if unit is in handover mode
    const { data: blockingSession } = await supabase
      .from('active_sessions')
      .select('id, handover_mode')
      .eq('unit_id', unitId)
      .eq('is_blocking', true)
      .eq('handover_mode', true)
      .gt('last_activity', thirtyMinutesAgo)
      .maybeSingle();

    if (!blockingSession) {
      return { error: 'Esta UTI não está em modo de passagem' };
    }

    // Check if there's already a receiver
    const { data: existingReceiver } = await supabase
      .from('active_sessions')
      .select('id')
      .eq('unit_id', unitId)
      .eq('is_handover_receiver', true)
      .gt('last_activity', thirtyMinutesAgo)
      .maybeSingle();

    if (existingReceiver) {
      return { error: 'Já existe alguém recebendo este plantão' };
    }

    // Delete any existing session for this user
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id);

    // Create receiver session
    const { data, error } = await supabase
      .from('active_sessions')
      .insert({
        user_id: user.id,
        unit_id: unitId,
        is_blocking: false,
        is_handover_receiver: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining as receiver:', error);
      return { error: 'Erro ao entrar como receptor' };
    }

    setActiveSession(data as ActiveSession);
    
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
    }

    return { error: null };
  };

  // Assume the shift (receiver becomes blocking, previous owner is removed)
  const assumeShift = async () => {
    if (!activeSession || !activeSession.is_handover_receiver) return;

    // Delete the blocking session for this unit (the one passing the shift)
    await supabase
      .from('active_sessions')
      .delete()
      .eq('unit_id', activeSession.unit_id)
      .eq('is_blocking', true);

    // Update our session to become the new blocking session
    const { data, error } = await supabase
      .from('active_sessions')
      .update({ 
        is_blocking: true, 
        is_handover_receiver: false,
        handover_mode: false 
      })
      .eq('id', activeSession.id)
      .select()
      .single();

    if (error) {
      console.error('Error assuming shift:', error);
    } else {
      setActiveSession(data as ActiveSession);
    }
  };

  // Select unit (for privileged users who can switch)
  const selectUnit = (unit: Unit) => {
    if (canSwitchUnits) {
      setSelectedUnit(unit);
      setShowAllUnits(false);
      // Also start/update session for this unit
      startSession(unit.id);
    }
  };

  // Select all units view (for coordinators and diaristas)
  const selectAllUnits = () => {
    if (canViewAllUnits) {
      setSelectedUnit(null);
      setShowAllUnits(true);
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
      showAllUnits,
      isInHandoverMode,
      isHandoverReceiver,
      canEdit,
      selectUnit,
      selectAllUnits,
      refreshUnits,
      startSession,
      endSession,
      updateActivity,
      startHandoverMode,
      endHandoverMode,
      joinAsHandoverReceiver,
      assumeShift
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
