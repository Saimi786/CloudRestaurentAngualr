import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateTableRequest, TableDto, TableStatus, UpdateTableRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class TablesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tables`;

  list(opts: {
    branchId?: string;
    floorPlanId?: string;
    status?: TableStatus;
    includeInactive?: boolean;
  } = {}): Observable<TableDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    if (opts.floorPlanId) params = params.set('floorPlanId', opts.floorPlanId);
    if (opts.status !== undefined) params = params.set('status', opts.status);
    return this.http.get<TableDto[]>(this.base, { params });
  }

  get(id: string): Observable<TableDto> {
    return this.http.get<TableDto>(`${this.base}/${id}`);
  }

  create(body: CreateTableRequest): Observable<TableDto> {
    return this.http.post<TableDto>(this.base, body);
  }

  update(body: UpdateTableRequest): Observable<TableDto> {
    return this.http.put<TableDto>(`${this.base}/${body.id}`, body);
  }

  setStatus(id: string, status: TableStatus): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/status`, { status });
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
