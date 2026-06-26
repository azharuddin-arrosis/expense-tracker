'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentMonthString } from './format';
import { Expense } from './types';

interface AppContextType {
  refreshKey: number;
  refreshData: () => void;
  showAddExpense: boolean;
  setShowAddExpense: (show: boolean) => void;
  showAddTarget: boolean;
  setShowAddTarget: (show: boolean) => void;
  addFlow: 'in' | 'out';
  setAddFlow: (flow: 'in' | 'out') => void;
  showFlowSelector: boolean;
  setShowFlowSelector: (show: boolean) => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  editTarget: Expense | null;
  setEditTarget: (target: Expense | null) => void;
}

const AppContext = createContext<AppContextType>({
  refreshKey: 0,
  refreshData: () => {},
  showAddExpense: false,
  setShowAddExpense: () => {},
  showAddTarget: false,
  setShowAddTarget: () => {},
  addFlow: 'out',
  setAddFlow: () => {},
  showFlowSelector: false,
  setShowFlowSelector: () => {},
  currentMonth: '',
  setCurrentMonth: () => {},
  editTarget: null,
  setEditTarget: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [addFlow, setAddFlow] = useState<'in' | 'out'>('out');
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthString);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

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
        showAddTarget,
        setShowAddTarget,
        addFlow,
        setAddFlow,
        showFlowSelector,
        setShowFlowSelector,
        currentMonth,
        setCurrentMonth,
        editTarget,
        setEditTarget,
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
