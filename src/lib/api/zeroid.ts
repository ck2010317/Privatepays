import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.ZEROID_BASE_URL || 'https://app.zeroid.cc/api/b2b';
const API_KEY = process.env.ZEROID_API_KEY || '';

// Types
export interface Card {
  id: string;
  card_id: string;
  title: string;
  email: string;
  phone_number: string;
  status: 'active' | 'frozen' | 'inactive';
  balance?: number;
  currency?: string;
  last_four?: string;
  created_at: string;
  updated_at?: string;
}

export interface CardSensitive {
  card_id?: string;
  card_number?: string;
  pan?: string;
  cvv?: string;
  security_code?: string;
  expiry_date?: string;
  expiry_month?: string;
  expiry_year?: string;
  cardholder_name?: string;
  vendor_b2b_key?: string;
  [key: string]: any; // Allow other fields from ZeroID
}

export interface CreateCardRequest {
  title: string;
  email: string;
  phone_number: string;
  card_commission_id: string;
  currency_id: string;
}

export interface TopUpRequest {
  amount: number;
  currency_id: string;
}

export interface Transaction {
  id: string;
  merchant?: {
    name: string;
    category: string;
  };
  billing_amount: number;
  billing_currency: string;
  status: string;
  created_at: string;
  description?: string;
}

export interface Currency {
  id: number;
  name: string;
  symbol: string;
  code: string;
  balance: number;
  currency_id: string;
}

export interface Vendor {
  id: number;
  name: string;
  description: string;
  b2b_key: string;
}

export interface CardCommission {
  id: string;
  name: string;
  commission_rate: number;
  min_amount: number;
  max_amount: number;
  vendor_id: number;
}

export interface IncomePayment {
  reference_id: string;
  amount: number;
  amount_after_commission: number;
  applied_commission: number;
  status: string;
  transaction_type: string;
  currency: Currency;
  card_id: string;
  card_name: string;
  created_at: string;
}

export interface DepositAddress {
  address: string;
  qr_code: string;
  currency: string;
  payment_system: string;
  reference_id: string;
  signature?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  count?: number;
  total?: number;
  has_more: boolean;
}

class ZeroIDApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('ZeroID API Error:', {
          status: error.response?.status,
          data: JSON.stringify(error.response?.data, null, 2),
          message: error.message,
        });
        const errorData = error.response?.data as { detail?: string; message?: string; error?: string; errors?: Array<{ loc?: string[]; msg?: string }> };
        let message = errorData?.detail || errorData?.message || errorData?.error || error.message;
        if (errorData?.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          message = `${message} - ${errorMessages}`;
        }
        throw new Error(message);
      }
    );
  }

  // Card Operations
  async getCards(skip = 0, limit = 20): Promise<{ cards: Card[]; has_more: boolean }> {
    const response = await this.client.get('/cards', {
      params: { skip, limit },
    });
    return {
      cards: response.data.data || response.data.cards || [],
      has_more: response.data.has_more || false,
    };
  }

  async getCard(cardId: string): Promise<Card> {
    const response = await this.client.get(`/cards/${cardId}`);
    return response.data.data || response.data;
  }

  async getCardSensitive(cardId: string): Promise<CardSensitive> {
    try {
      const response = await this.client.get(`/cards/${cardId}/sensitive`);
      console.log(`[ZeroID] Sensitive data response for ${cardId}:`, response.data);
      const sensitiveData = response.data.data || response.data;
      console.log(`[ZeroID] Extracted sensitive data:`, sensitiveData);
      return sensitiveData;
    } catch (error) {
      console.error(`[ZeroID] Error fetching sensitive data for ${cardId}:`, error);
      throw error;
    }
  }

  async createCard(data: CreateCardRequest): Promise<{ card_id: string; message: string }> {
    const response = await this.client.post('/cards', data);
    return response.data;
  }

  async topUpCard(cardId: string, data: TopUpRequest): Promise<{ reference_id: string; final_amount: number; message: string }> {
    const response = await this.client.post(`/cards/${cardId}/topup`, data);
    return response.data;
  }

  async freezeCard(cardId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/cards/${cardId}/freeze`);
    return response.data;
  }

  async unfreezeCard(cardId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/cards/${cardId}/unfreeze`);
    return response.data;
  }

  async getCardTransactions(
    cardId: string,
    params: { skip?: number; limit?: number; from_date?: string; to_date?: string } = {}
  ): Promise<{ transactions: Transaction[]; count: number; has_more: boolean }> {
    const response = await this.client.get(`/cards/${cardId}/transactions`, { params });
    return {
      transactions: response.data.data || [],
      count: response.data.count || 0,
      has_more: response.data.has_more || false,
    };
  }

  // Financial Data
  async getIncomePayments(params: {
    transaction_type?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ payments: IncomePayment[]; total: number; has_more: boolean }> {
    const response = await this.client.get('/income-payments', { params });
    return {
      payments: response.data.payments || [],
      total: response.data.total || 0,
      has_more: response.data.has_more || false,
    };
  }

  // Resources
  async getVendors(): Promise<Vendor[]> {
    const response = await this.client.get('/vendors');
    return response.data.vendors || [];
  }

  async getCurrencies(): Promise<Currency[]> {
    const response = await this.client.get('/currencies');
    return response.data.currencies || [];
  }

  async getCardCommissions(): Promise<CardCommission[]> {
    const response = await this.client.get('/card-commissions');
    return response.data.commissions || response.data.data || [];
  }

  // Wallet
  async getDepositAddress(params: {
    currency: string;
    payment_system: string;
    amount?: number;
    signature?: boolean;
  }): Promise<DepositAddress> {
    const response = await this.client.get('/wallet/address', { params });
    return response.data;
  }
}

export const zeroidApi = new ZeroIDApi();
export default zeroidApi;
