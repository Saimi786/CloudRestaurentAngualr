import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePlatformTenantRequest,
  PlatformTenantDetails,
  PlatformTenantListItem,
  UpdatePlatformTenantRequest
} from '../models';

/**
 * SuperAdmin-only console for managing tenants (businesses) across the platform.
 * Every call requires the `Platform.ManageTenants` permission server-side.
 */
@Injectable({ providedIn: 'root' })
export class PlatformTenantsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/platform/tenants`;

  list(includeInactive = true): Observable<PlatformTenantListItem[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<PlatformTenantListItem[]>(this.base, { params });
  }

  get(id: string): Observable<PlatformTenantDetails> {
    return this.http.get<PlatformTenantDetails>(`${this.base}/${id}`);
  }

  create(body: CreatePlatformTenantRequest): Observable<PlatformTenantDetails> {
    return this.http.post<PlatformTenantDetails>(this.base, body);
  }

  update(id: string, body: UpdatePlatformTenantRequest): Observable<PlatformTenantDetails> {
    return this.http.put<PlatformTenantDetails>(`${this.base}/${id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/deactivate`, {});
  }

  activate(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/activate`, {});
  }

  /** Cross-tenant branch list for the Manage Business page. */
  branches(tenantId: string): Observable<PlatformBranchDto[]> {
    return this.http.get<PlatformBranchDto[]>(`${this.base}/${tenantId}/branches`);
  }

  /** Full branch + tenant + owner detail for Manage Location. */
  branchDetail(branchId: string): Observable<PlatformBranchDetailDto> {
    return this.http.get<PlatformBranchDetailDto>(
      `${environment.apiBaseUrl}/platform/branches/${branchId}`);
  }

  /** Users assigned to a specific branch (cross-tenant). */
  branchUsers(branchId: string): Observable<UserSummaryLike[]> {
    return this.http.get<UserSummaryLike[]>(
      `${environment.apiBaseUrl}/platform/branches/${branchId}/users`);
  }

  /** Cross-tenant password reset for any user (SuperAdmin only). */
  resetUserPassword(userId: string, newPassword: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/platform/users/${userId}/reset-password`,
      { newPassword });
  }
}

export interface PlatformBranchDto {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  code: string;
  phoneNumber: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  addressLine1: string | null;
  timeZone: string;
  isActive: boolean;
}

export interface PlatformBranchDetailDto {
  tenantId: string;
  tenantName: string;
  tenantBusinessType: number;
  tenantPlan: number;
  tenantLogoUrl: string | null;
  ownerEmail: string | null;
  companyId: string;
  companyName: string;
  companyLegalName: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  branchPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timeZone: string;
  branchIsActive: boolean;
}

/** Mirrors UserSummary on the API — kept loose to avoid coupling here. */
export interface UserSummaryLike {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: string[];
  branchIds: string[];
  maxDiscountPercent: number | null;
}
