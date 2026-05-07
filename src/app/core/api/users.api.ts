import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateUserRequest, ResetPasswordRequest, UpdateUserRequest, UserDto
} from '../models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/users`;

  list(includeInactive = false): Observable<UserDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<UserDto[]>(this.base, { params });
  }

  get(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/${id}`);
  }

  create(body: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(this.base, body);
  }

  update(id: string, body: UpdateUserRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/${id}`, body);
  }

  resetPassword(id: string, body: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reset-password`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
