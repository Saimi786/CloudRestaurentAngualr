import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMixMatchGroupRequest,
  MixMatchGroupDetailDto,
  MixMatchGroupDto,
  UpdateMixMatchGroupRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class MixMatchApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/mix-match-groups`;

  list(includeInactive = false): Observable<MixMatchGroupDto[]> {
    return this.http.get<MixMatchGroupDto[]>(this.base, { params: { includeInactive } });
  }

  get(id: string): Observable<MixMatchGroupDetailDto> {
    return this.http.get<MixMatchGroupDetailDto>(`${this.base}/${id}`);
  }

  create(body: CreateMixMatchGroupRequest): Observable<MixMatchGroupDetailDto> {
    return this.http.post<MixMatchGroupDetailDto>(this.base, body);
  }

  update(id: string, body: UpdateMixMatchGroupRequest): Observable<MixMatchGroupDetailDto> {
    return this.http.put<MixMatchGroupDetailDto>(`${this.base}/${id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
