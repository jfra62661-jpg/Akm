export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  phone: string;
  email?: string;
  role: UserRole;
  points: number;
  mining_start: string | null;
  package_id: number | null;
  name?: string;
  avatar?: string;
  theme?: 'light' | 'dark';
  language?: 'ar' | 'en';
  spent_points: number;
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

export interface Package {
  id: number;
  name: string;
  price: number;
  bonus_percent: number;
  return_months: number;
}

export interface PackageRequest {
  id: number;
  user_id: number;
  user_phone?: string;
  package_id: number;
  package_name?: string;
  package_price?: number;
  proof_image: string;
  status: RequestStatus;
  created_at: string;
}

export interface AppSettings {
  rate: number;
  transfer_phone: string;
  min_withdraw_points: number;
  win_rate_luck: number;
  luck_gift_win_rate: number;
  luck_gift_multiplier: number;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  user_phone?: string;
  points: number;
  amount: number;
  wallet_number: string;
  status: RequestStatus;
  created_at: string;
}

export interface ChargeRequest {
  id: number;
  user_id: number;
  user_phone?: string;
  user_name?: string;
  amount: number;
  price: number;
  proof_image: string;
  status: RequestStatus;
  created_at: string;
}

export interface Gift {
  id: number;
  name: string;
  price: number;
  icon: string;
  type: 'normal' | 'luck' | 'flag';
}

export interface Room {
  id: number;
  owner_id: number;
  name: string;
  image: string;
  max_mics: number;
  created_at: string;
  owner_name?: string;
  owner_avatar?: string;
}
