'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentMonthString } from './format';

interface AppContextType {
  refreshKey: number;
  refreshData: () => void;
  showAddExpense: boolean;
  setShowAddExpense: (show: boolean) => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}

const AppContext = createContext<AppContextType>({
  refreshKey: 0,
  refreshData: () => {},
  showAddExpense: false,
  setShowAddExpense: () => {},
  currentMonth: '',
  setCurrentMonth: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);
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
