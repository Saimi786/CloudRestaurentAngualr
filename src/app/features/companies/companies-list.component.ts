import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CompaniesApi } from '../../core/api/companies.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { CompanyDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (!auth.hasRole('SuperAdmin')) {
      <div class="readonly-banner">
        <span class="icon">🔒</span>
        <div>
          <strong>Read-only view.</strong>
          Only the platform SuperAdmin can create or edit companies. Contact your account
          manager to request changes.
        </div>
      </div>
    }

    <div class="page-header">
      <div>
        <h1>Companies</h1>
        <p class="muted">Brands / legal entities under your tenant.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('SuperAdmin')) {
          <a class="btn btn-primary" routerLink="/companies/new">+ New Company</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Legal Name</th>
          <th>Currency</th>
          <th>Tax #</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (companies().length === 0) {
          <tr><td colspan="6" class="empty">No companies yet.</td></tr>
        } @else {
          @for (c of companies(); track c.id) {
            <tr [class.inactive]="!c.isActive">
              <td>{{ c.name }}</td>
              <td>{{ c.legalName }}</td>
              <td>{{ c.defaultCurrency }}</td>
              <td>{{ c.taxRegistrationNumber || '—' }}</td>
              <td>
                <span class="badge" [class.badge-active]="c.isActive" [class.badge-inactive]="!c.isActive">
                  {{ c.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/companies', c.id]">{{ auth.hasRole('SuperAdmin') ? 'Edit' : 'View' }}</a>
                @if (auth.hasRole('SuperAdmin') && c.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(c)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
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
export class CompaniesListComponent {
  private readonly api = inject(CompaniesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly loading = signal(true);
  protected includeInactive = false;

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.includeInactive).subscribe({
      next: list => { this.companies.set(list); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }

  deactivate(c: CompanyDto): void {
    if (!confirm(`Deactivate company "${c.name}"?`)) return;
    this.api.deactivate(c.id).subscribe({
      next: () => { this.notify.success(`${c.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
