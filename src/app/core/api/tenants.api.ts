import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantDto } from '../models';

@Injectable({ providedIn: 'root' })
export class TenantsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tenants`;

  getCurrent(): Observable<TenantDto> {
    return this.http.get<TenantDto>(`${this.base}/me`);
  }
}
