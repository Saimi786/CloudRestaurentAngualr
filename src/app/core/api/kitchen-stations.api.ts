import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateKitchenStationRequest,
  KitchenStationDto,
  UpdateKitchenStationRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class KitchenStationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/kitchen-stations`;

  list(branchId?: string, includeInactive = false): Observable<KitchenStationDto[]> {
    let params = new HttpParams().set('includeInactive', includeInactive);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<KitchenStationDto[]>(this.base, { params });
  }

  get(id: string): Observable<KitchenStationDto> {
    return this.http.get<KitchenStationDto>(`${this.base}/${id}`);
  }

  create(body: CreateKitchenStationRequest): Observable<KitchenStationDto> {
    return this.http.post<KitchenStationDto>(this.base, body);
  }

  update(body: UpdateKitchenStationRequest): Observable<KitchenStationDto> {
    return this.http.put<KitchenStationDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
