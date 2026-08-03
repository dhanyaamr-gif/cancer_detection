"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nova.sidebar.collapsed');
      setCollapsedState(raw === 'true');
    } catch {
      // ignore
    }
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('nova.sidebar.collapsed', collapsed ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setCollapsed = (v: boolean) => setCollapsedState(v);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, drawerOpen, setDrawerOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export default SidebarProvider;
