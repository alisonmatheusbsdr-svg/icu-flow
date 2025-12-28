import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
}

interface UnitContextType {
  units: Unit[];
  selectedUnit: Unit | null;
  isLoading: boolean;
  selectUnit: (unit: Unit) => void;
  refreshUnits: () => Promise<void>;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children }: { children: ReactNode }) {
  const { user, isApproved } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = async () => {
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
      // Auto-select first unit if none selected
      if (!selectedUnit && data.length > 0) {
        setSelectedUnit(data[0]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && isApproved) {
      fetchUnits();
    } else {
      setUnits([]);
      setSelectedUnit(null);
      setIsLoading(false);
    }
  }, [user, isApproved]);

  const selectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  const refreshUnits = async () => {
    await fetchUnits();
  };

  return (
    <UnitContext.Provider value={{
      units,
      selectedUnit,
      isLoading,
      selectUnit,
      refreshUnits
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