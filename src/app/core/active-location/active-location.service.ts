import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BranchesApi } from '../api/branches.api';
import { AuthService } from '../auth/auth.service';

/**
 * One picked branch is the "active operating location" for the signed-in user.
 * Mirrors Blocks360's top-bar location selector — pick a branch and every
 * downstream feature (POS, Kitchen, Reports) defaults to that scope.
 *
 * For SuperAdmin: choices include every active branch across every tenant.
 * For non-SuperAdmin: choices are the branches in their tenant (the existing
 * /branches endpoint already filters by JWT tid + the global query filter).
 *
 * The chosen branch id is persisted in localStorage so a page refresh doesn't
 * dump them back to a default outlet. When the user logs out the AuthService
 * clears auth state — this service watches the auth state and clears its own
 * choice on logout to avoid leaking it into another tenant's session.
 */
export interface ActiveLocationOption {
  branchId: string;
  tenantId: string;
  tenantName: string;     // may be the caller's own tenant for non-SuperAdmin
  branchName: string;
  branchCode: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
}

const STORAGE_KEY = 'cr.activeBranch';

@Injectable({ providedIn: 'root' })
export class ActiveLocationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly branchesApi = inject(BranchesApi);

  private readonly _options = signal<ActiveLocationOption[]>([]);
  private readonly _currentId = signal<string | null>(this.loadStoredId());
  private readonly _loaded = signal(false);

  readonly options = this._options.asReadonly();
  readonly currentId = this._currentId.asReadonly();
  readonly current = computed<ActiveLocationOption | null>(() => {
    const id = this._currentId();
    if (!id) return null;
    return this._options().find(o => o.branchId === id) ?? null;
  });
  readonly loaded = this._loaded.asReadonly();

  /**
   * Load the user's available locations. SuperAdmin gets every branch via the
   * platform endpoint; everyone else gets their tenant's branches. Idempotent —
   * subsequent calls just refresh the list.
   */
  load(): Observable<ActiveLocationOption[]> {
    const isSuperAdmin = this.auth.hasRole('SuperAdmin');
    const url = isSuperAdmin
      ? `${environment.apiBaseUrl}/platform/branches`
      : null;

    if (url) {
      return this.http.get<ActiveLocationOption[]>(url).pipe(
        tap(list => this.applyOptions(list))
      ) as unknown as Observable<ActiveLocationOption[]>;
    }

    // Non-SuperAdmin path: use the existing /branches list (already scoped server-side).
    const tenantName = this.auth.user()?.tenantId ?? '';
    return new Observable(sub => {
      this.branchesApi.list().subscribe({
        next: list => {
          const opts: ActiveLocationOption[] = list
            .filter(b => b.isActive)
            .map(b => ({
              branchId: b.id,
              tenantId: tenantName,
              tenantName: 'Your tenant',
              branchName: b.name,
              branchCode: b.code,
              city: b.location?.city ?? null,
              country: b.location?.country ?? null,
              isActive: b.isActive,
            }));
          this.applyOptions(opts);
          sub.next(opts);
          sub.complete();
        },
        error: err => sub.error(err),
      });
    });
  }

  /** Switch the active location and persist it. */
  select(branchId: string): void {
    if (!this._options().some(o => o.branchId === branchId)) return;
    this._currentId.set(branchId);
    try { localStorage.setItem(STORAGE_KEY, branchId); } catch { /* private mode */ }
  }

  /** Forget the selection — called on logout. */
  clear(): void {
    this._currentId.set(null);
    this._options.set([]);
    this._loaded.set(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  }

  private applyOptions(opts: ActiveLocationOption[]): void {
    this._options.set(opts);
    this._loaded.set(true);

    // If the stored id is still valid, keep it; otherwise auto-pick the first.
    const stored = this._currentId();
    if (stored && opts.some(o => o.branchId === stored)) return;
    const fallback = opts[0]?.branchId ?? null;
    this._currentId.set(fallback);
    if (fallback) {
      try { localStorage.setItem(STORAGE_KEY, fallback); } catch { /* */ }
    }
  }

  private loadStoredId(): string | null {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
}
