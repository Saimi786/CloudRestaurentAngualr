import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionDescriptor, RoleDetailsDto, RoleDto } from '../models';

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/roles`;

  list(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.base);
  }

  details(): Observable<RoleDetailsDto[]> {
    return this.http.get<RoleDetailsDto[]>(`${this.base}/details`);
  }

  permissions(): Observable<PermissionDescriptor[]> {
    return this.http.get<PermissionDescriptor[]>(`${this.base}/permissions`);
  }

  create(body: { name: string; permissions: string[] }): Observable<RoleDetailsDto> {
    return this.http.post<RoleDetailsDto>(this.base, body);
  }

  update(id: string, body: { name: string; permissions: string[] }): Observable<RoleDetailsDto> {
    return this.http.put<RoleDetailsDto>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
