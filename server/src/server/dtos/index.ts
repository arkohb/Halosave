
// DTOs for data transfer and validation
export interface RegisterDto {
  fullName: string; email: string; phone?: string; country?: string; password?: string; referredBy?: string;
}
export interface LoginDto {
  email: string; password?: string;
}
export interface CreateVaultDto {
  name: string; color?: string; icon?: string; targetAmount: number; targetDate?: string; description?: string;
}
export interface CreateDepositDto {
  vaultId: string; amount: number; currency?: string; lockDays?: number; paymentMethod?: string; reference?: string;
}
export interface WithdrawDto {
  trancheId: string; destinationAccount?: string;
}
