import { create } from 'zustand';

export interface AuditEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'permission' | 'scope';
  targetType: 'role';
  targetName: string;
  detail: string;
  operator: string;
  timestamp: number;
}

interface AuditState {
  logs: AuditEntry[];
  addLog: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],

  addLog: (entry) => {
    set((s) => ({
      logs: [
        { ...entry, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
        ...s.logs,
      ].slice(0, 100), // keep last 100
    }));
  },

  clearLogs: () => set({ logs: [] }),
}));
