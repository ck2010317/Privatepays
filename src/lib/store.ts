'use client';

import { create } from 'zustand';
import { Card, Currency } from '@/lib/api/zeroid';

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  balance: number;
  isActive: boolean;
}

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserBalance: (balance: number) => void;
  
  // Cards
  cards: Card[];
  selectedCard: Card | null;
  setCards: (cards: Card[]) => void;
  setSelectedCard: (card: Card | null) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  
  // Currencies
  currencies: Currency[];
  setCurrencies: (currencies: Currency[]) => void;
  
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Modals
  createCardModalOpen: boolean;
  topUpModalOpen: boolean;
  depositModalOpen: boolean;
  setCreateCardModalOpen: (open: boolean) => void;
  setTopUpModalOpen: (open: boolean) => void;
  setDepositModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  updateUserBalance: (balance) =>
    set((state) => ({
      user: state.user ? { ...state.user, balance } : null,
    })),
  
  // Cards
  cards: [],
  selectedCard: null,
  setCards: (cards) => set({ cards }),
  setSelectedCard: (card) => set({ selectedCard: card }),
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.card_id === cardId || card.id === cardId
          ? { ...card, ...updates }
          : card
      ),
      selectedCard:
        state.selectedCard?.card_id === cardId || state.selectedCard?.id === cardId
          ? { ...state.selectedCard, ...updates }
          : state.selectedCard,
    })),
  
  // Currencies
  currencies: [],
  setCurrencies: (currencies) => set({ currencies }),
  
  // UI State
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  // Modals
  createCardModalOpen: false,
  topUpModalOpen: false,
  depositModalOpen: false,
  setCreateCardModalOpen: (open) => set({ createCardModalOpen: open }),
  setTopUpModalOpen: (open) => set({ topUpModalOpen: open }),
  setDepositModalOpen: (open) => set({ depositModalOpen: open }),
}));
