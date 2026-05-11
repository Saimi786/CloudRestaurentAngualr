import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateFloorPlanRequest, FloorPlanDto, UpdateFloorPlanRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class FloorPlansApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/floor-plans`;

  list(opts: { branchId?: string; includeInactive?: boolean } = {}): Observable<FloorPlanDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    return this.http.get<FloorPlanDto[]>(this.base, { params });
  }

  get(id: string): Observable<FloorPlanDto> {
    return this.http.get<FloorPlanDto>(`${this.base}/${id}`);
  }

  create(body: CreateFloorPlanRequest): Observable<FloorPlanDto> {
    return this.http.post<FloorPlanDto>(this.base, body);
  }

  update(body: UpdateFloorPlanRequest): Observable<FloorPlanDto> {
    return this.http.put<FloorPlanDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
