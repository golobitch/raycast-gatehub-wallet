import { Toast } from "@raycast/api";

export interface WalletType {
  uuid: string;
  name: string;
  address: string;
  type: string;
  created_at: string;
  updated_at: string;
  balances: BalanceType[];
}

export interface BalanceType {
  available: string;
  pending: string;
  total: string;
  vault: VaultType;
}

export interface VaultType {
  asset_name: string;
  asset_code: string;
}

export interface LoadItemsResponse<T> {
  items?: T
  error?: {
    toast?: Toast.Options
  }
}
