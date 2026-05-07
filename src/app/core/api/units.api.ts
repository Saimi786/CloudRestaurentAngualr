import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUnitRequest, UnitDto, UpdateUnitRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class UnitsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/units`;

  list(opts: { groupId?: string; includeInactive?: boolean } = {}): Observable<UnitDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.groupId) params = params.set('groupId', opts.groupId);
    return this.http.get<UnitDto[]>(this.base, { params });
  }

  get(id: string): Observable<UnitDto> {
    return this.http.get<UnitDto>(`${this.base}/${id}`);
  }

  create(body: CreateUnitRequest): Observable<UnitDto> {
    return this.http.post<UnitDto>(this.base, body);
  }

  update(body: UpdateUnitRequest): Observable<UnitDto> {
    return this.http.put<UnitDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
