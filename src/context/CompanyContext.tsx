'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type KodePerusahaan = 'SEMUA' | 'KTA' | 'KAI' | 'KMB';

interface CompanyContextType {
  selectedCompany: KodePerusahaan;
  setSelectedCompany: (company: KodePerusahaan) => void;
  companies: { kode: KodePerusahaan; label: string }[];
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<KodePerusahaan>('SEMUA');

  useEffect(() => {
    const saved = localStorage.getItem('rosta_selected_company') as KodePerusahaan;
    if (saved && ['SEMUA', 'KTA', 'KAI', 'KMB'].includes(saved)) {
      setSelectedCompanyState(saved);
    }
  }, []);

  const setSelectedCompany = (company: KodePerusahaan) => {
    setSelectedCompanyState(company);
    localStorage.setItem('rosta_selected_company', company);
  };

  const companies: { kode: KodePerusahaan; label: string }[] = [
    { kode: 'SEMUA', label: 'Semua Perusahaan' },
    { kode: 'KTA', label: 'PT Karunia Tirta Agung (KTA)' },
    { kode: 'KAI', label: 'PT Karya Abadi Indotech (KAI)' },
    { kode: 'KMB', label: 'PT KMB' },
  ];

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
