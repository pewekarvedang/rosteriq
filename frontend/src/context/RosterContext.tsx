import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Roster, RosterDetail, MonthlyGenerationResponse } from '../types';

interface RosterContextType {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  activeRoster: Roster | null;
  setActiveRoster: (r: Roster | null) => void;
  rosterDetail: RosterDetail | null;
  setRosterDetail: (rd: RosterDetail | null) => void;
  generationResult: MonthlyGenerationResponse | null;
  setGenerationResult: (res: MonthlyGenerationResponse | null) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

export const RosterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to November 2026 matching our seed database
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeRoster, setActiveRoster] = useState<Roster | null>(null);
  const [rosterDetail, setRosterDetail] = useState<RosterDetail | null>(null);
  const [generationResult, setGenerationResult] = useState<MonthlyGenerationResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  return (
    <RosterContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        activeRoster,
        setActiveRoster,
        rosterDetail,
        setRosterDetail,
        generationResult,
        setGenerationResult,
        isGenerating,
        setIsGenerating,
      }}
    >
      {children}
    </RosterContext.Provider>
  );
};

export const useRoster = (): RosterContextType => {
  const context = useContext(RosterContext);
  if (!context) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};
