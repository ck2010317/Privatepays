'use client';

import axios from 'axios';
import { 
  Card, 
  CardSensitive, 
  CreateCardRequest, 
  TopUpRequest, 
  Transaction, 
  Currency, 
  Vendor, 
  CardCommission, 
  IncomePayment,
  DepositAddress 
} from '@/lib/api/zeroid';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cards
export async function fetchCards(skip = 0, limit = 20) {
  const response = await api.get<{ cards: Card[] }>('/user/cards');
  return response.data;
}

export async function fetchCard(cardId: string) {
  const response = await api.get<Card>(`/cards/${cardId}`);
  return response.data;
}

export async function fetchCardSensitive(cardId: string) {
  const response = await api.get<CardSensitive>(`/cards/${cardId}/sensitive`);
  return response.data;
}

export async function createCard(data: CreateCardRequest) {
  const response = await api.post<{ card_id: string; message: string }>('/cards', data);
  return response.data;
}

export async function topUpCard(cardId: string, data: TopUpRequest) {
  const response = await api.post<{ reference_id: string; final_amount: number; message: string }>(
    `/cards/${cardId}/topup`,
    data
  );
  return response.data;
}

export async function freezeCard(cardId: string) {
  const response = await api.post<{ message: string }>(`/cards/${cardId}/freeze`);
  return response.data;
}

export async function unfreezeCard(cardId: string) {
  const response = await api.post<{ message: string }>(`/cards/${cardId}/unfreeze`);
  return response.data;
}

export async function fetchCardTransactions(
  cardId: string,
  params: { skip?: number; limit?: number; from_date?: string; to_date?: string } = {}
) {
  const response = await api.get<{ transactions: Transaction[]; count: number; has_more: boolean }>(
    `/cards/${cardId}/transactions`,
    { params }
  );
  return response.data;
}

// Currencies
export async function fetchCurrencies() {
  const response = await api.get<{ currencies: Currency[] }>('/currencies');
  return response.data.currencies;
}

// Vendors
export async function fetchVendors() {
  const response = await api.get<{ vendors: Vendor[] }>('/vendors');
  return response.data.vendors;
}

// Commissions
export async function fetchCommissions() {
  const response = await api.get<{ commissions: CardCommission[] }>('/commissions');
  return response.data.commissions;
}

// Income Payments
export async function fetchIncomePayments(params: {
  transaction_type?: string;
  skip?: number;
  limit?: number;
} = {}) {
  const response = await api.get<{ payments: IncomePayment[]; total: number; has_more: boolean }>(
    '/income-payments',
    { params }
  );
  return response.data;
}

// Wallet
export async function fetchDepositAddress(params: {
  currency: string;
  payment_system: string;
  amount?: number;
}) {
  const response = await api.get<DepositAddress>('/wallet/address', { params });
  return response.data;
}
