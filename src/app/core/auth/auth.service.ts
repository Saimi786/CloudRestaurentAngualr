import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthState, LoginRequest, LoginResponse } from './auth.models';

const STORAGE_KEY = 'cr.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _state = signal<AuthState | null>(this.loadFromStorage());
  readonly state = this._state.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this._state();
    return !!s && s.expiresAt.getTime() > Date.now();
  });
  readonly user = computed(() => this._state());

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap(res => this.persist(res)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._state.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this._state()?.accessToken ?? null;
  }

  hasRole(role: string): boolean {
    return this._state()?.roles.includes(role) ?? false;
  }

  private persist(res: LoginResponse): void {
    const state: AuthState = {
      accessToken: res.accessToken,
      expiresAt: new Date(res.expiresAt),
      userId: res.userId,
      email: res.email,
      fullName: res.fullName,
      tenantId: res.tenantId,
      roles: res.roles
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    this._state.set(state);
  }

  private loadFromStorage(): AuthState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
    } catch {
      return null;
    }
  }
}
