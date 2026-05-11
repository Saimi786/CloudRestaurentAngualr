export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
  branchIds: string[];
  maxDiscountPercent: number | null;
}

export interface AuthState {
  accessToken: string;
  expiresAt: Date;
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
  branchIds: string[];
  maxDiscountPercent: number | null;
}
