import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { CompaniesApi } from '../../core/api/companies.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, CompanyDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (!auth.hasRole('SuperAdmin')) {
      <div class="readonly-banner">
        <span class="icon">🔒</span>
        <div>
          <strong>Read-only view.</strong>
          Only the platform SuperAdmin can create or edit branches. Contact your account
          manager to request a new branch or changes.
        </div>
      </div>
    }

    <div class="page-header">
      <div>
        <h1>Branches</h1>
        <p class="muted">Operational outlets across your companies.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="companyFilter" (ngModelChange)="reload()">
          <option value="">All companies</option>
          @for (c of companies(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('SuperAdmin')) {
          <a class="btn btn-primary" routerLink="/branches/new">+ New Branch</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Code</th>
          <th>Company</th>
          <th>City</th>
          <th>Phone</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="7" class="empty">Loading…</td></tr>
        } @else if (branches().length === 0) {
          <tr><td colspan="7" class="empty">No branches yet.</td></tr>
        } @else {
          @for (b of branches(); track b.id) {
            <tr [class.inactive]="!b.isActive">
              <td>{{ b.name }}</td>
              <td class="mono">{{ b.code }}</td>
              <td>{{ companyName(b.companyId) }}</td>
              <td>{{ b.location.city || '—' }}</td>
              <td>{{ b.phoneNumber || '—' }}</td>
              <td>
                <span class="badge" [class.badge-active]="b.isActive" [class.badge-inactive]="!b.isActive">
                  {{ b.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/branches', b.id]">
                  {{ auth.hasRole('SuperAdmin') ? 'Edit' : 'View' }}
                </a>
                @if (auth.hasRole('SuperAdmin') && b.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(b)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .readonly-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: var(--c-info-soft);
      border: 1px solid #bae6fd;
      color: var(--c-info-fg);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1rem;
      font-size: 0.875rem;
      .icon { font-size: 1.3rem; }
      strong { display: block; margin-bottom: 1px; }
    }
  `]
})
export class BranchesListComponent {
  private readonly branchesApi = inject(BranchesApi);
  private readonly companiesApi = inject(CompaniesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly loading = signal(true);
  protected companyFilter = '';
  protected includeInactive = false;

  constructor() {
    this.companiesApi.list(true).subscribe(list => this.companies.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.branchesApi.list(this.companyFilter || undefined, this.includeInactive).subscribe({
      next: list => { this.branches.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  companyName(id: string): string {
    return this.companies().find(c => c.id === id)?.name ?? '—';
  }

  deactivate(b: BranchDto): void {
    if (!confirm(`Deactivate branch "${b.name}"?`)) return;
    this.branchesApi.deactivate(b.id).subscribe({
      next: () => { this.notify.success(`${b.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
