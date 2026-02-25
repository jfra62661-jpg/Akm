export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  phone: string;
  role: UserRole;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'paid';

export interface CreditRequest {
  id: number;
  user_id: number;
  user_phone?: string;
  amount: number;
  price: number;
  wallet_number: string;
  bank_account: string;
  proof_image: string;
  status: RequestStatus;
  created_at: string;
}

export interface AppSettings {
  rate: number;
  transfer_phone: string;
}
