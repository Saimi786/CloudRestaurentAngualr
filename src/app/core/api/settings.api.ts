import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessSettingsDto, UpdateBusinessSettingsRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/settings`;

  getBusiness(): Observable<BusinessSettingsDto> {
    return this.http.get<BusinessSettingsDto>(`${this.base}/business`);
  }

  updateBusiness(body: UpdateBusinessSettingsRequest): Observable<BusinessSettingsDto> {
    return this.http.put<BusinessSettingsDto>(`${this.base}/business`, body);
  }
}
