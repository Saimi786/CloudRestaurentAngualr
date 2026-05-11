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
}
