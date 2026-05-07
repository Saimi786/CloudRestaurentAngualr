import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BranchDto, CreateBranchRequest, UpdateBranchRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/branches`;

  list(companyId?: string, includeInactive = false): Observable<BranchDto[]> {
    let params = new HttpParams().set('includeInactive', includeInactive);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<BranchDto[]>(this.base, { params });
  }

  get(id: string): Observable<BranchDto> {
    return this.http.get<BranchDto>(`${this.base}/${id}`);
  }

  create(body: CreateBranchRequest): Observable<BranchDto> {
    return this.http.post<BranchDto>(this.base, body);
  }

  update(body: UpdateBranchRequest): Observable<BranchDto> {
    return this.http.put<BranchDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
