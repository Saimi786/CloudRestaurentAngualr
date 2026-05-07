import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUnitGroupRequest, UnitGroupDto, UpdateUnitGroupRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class UnitGroupsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/unit-groups`;

  list(includeInactive = false): Observable<UnitGroupDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<UnitGroupDto[]>(this.base, { params });
  }

  get(id: string): Observable<UnitGroupDto> {
    return this.http.get<UnitGroupDto>(`${this.base}/${id}`);
  }

  create(body: CreateUnitGroupRequest): Observable<UnitGroupDto> {
    return this.http.post<UnitGroupDto>(this.base, body);
  }

  update(body: UpdateUnitGroupRequest): Observable<UnitGroupDto> {
    return this.http.put<UnitGroupDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
