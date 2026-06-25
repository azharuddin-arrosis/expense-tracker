'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentMonthString } from './format';

interface AppContextType {
  refreshKey: number;
  refreshData: () => void;
  showAddExpense: boolean;
  setShowAddExpense: (show: boolean) => void;
  addFlow: 'in' | 'out';
  setAddFlow: (flow: 'in' | 'out') => void;
  showFlowSelector: boolean;
  setShowFlowSelector: (show: boolean) => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}

const AppContext = createContext<AppContextType>({
  refreshKey: 0,
  refreshData: () => {},
  showAddExpense: false,
  setShowAddExpense: () => {},
  addFlow: 'out',
  setAddFlow: () => {},
  showFlowSelector: false,
  setShowFlowSelector: () => {},
  currentMonth: '',
  setCurrentMonth: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addFlow, setAddFlow] = useState<'in' | 'out'>('out');
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthString);

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <AppContext.Provider
      value={{
        refreshKey,
        refreshData,
        showAddExpense,
        setShowAddExpense,
        addFlow,
        setAddFlow,
        showFlowSelector,
        setShowFlowSelector,
        currentMonth,
        setCurrentMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
