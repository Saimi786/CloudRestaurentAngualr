import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KitchenTicketDto, KitchenTicketStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class KitchenApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/kitchen`;

  list(opts: { branchId?: string; stationId?: string; includeServed?: boolean } = {}): Observable<KitchenTicketDto[]> {
    let params = new HttpParams().set('includeServed', opts.includeServed ?? false);
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    if (opts.stationId) params = params.set('stationId', opts.stationId);
    return this.http.get<KitchenTicketDto[]>(`${this.base}/tickets`, { params });
  }

  advance(id: string, status: KitchenTicketStatus): Observable<KitchenTicketDto> {
    return this.http.post<KitchenTicketDto>(`${this.base}/tickets/${id}/advance`, { status });
  }

  bump(id: string, stationId: string, unbump = false): Observable<KitchenTicketDto> {
    return this.http.post<KitchenTicketDto>(`${this.base}/tickets/${id}/bump`, { stationId, unbump });
  }
}
