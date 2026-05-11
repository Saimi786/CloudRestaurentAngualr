import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomersApi } from '../../core/api/customers.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { CustomerDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Customers</h1>
        <p class="muted">Loyalty members and walk-in regulars. Search by name, phone, or email.</p>
      </div>
      <div class="actions">
        <input class="search" type="search" placeholder="Search…"
               [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager') || auth.hasRole('Cashier')) {
          <a class="btn btn-primary" routerLink="/customers/new">+ New Customer</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th style="text-align:right;">Loyalty</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No customers found.</td></tr>
        } @else {
          @for (c of rows(); track c.id) {
            <tr [class.inactive]="!c.isActive">
              <td>{{ c.fullName }}</td>
              <td class="mono">{{ c.phone || '—' }}</td>
              <td class="mono">{{ c.email || '—' }}</td>
              <td style="text-align:right;" class="mono">{{ c.loyaltyPoints }}</td>
              <td>
                <span class="badge" [class.badge-active]="c.isActive" [class.badge-inactive]="!c.isActive">
                  {{ c.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/customers', c.id]">Edit</a>
                @if ((auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) && c.isActive) {
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
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .search {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 240px;
    }
  `]
})
export class CustomersListComponent {
  private readonly api = inject(CustomersApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<CustomerDto[]>([]);
  protected readonly loading = signal(true);
  protected search = '';
  protected includeInactive = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() { this.reload(); }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({
      search: this.search || undefined,
      includeInactive: this.includeInactive
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(c: CustomerDto): void {
    if (!confirm(`Deactivate customer "${c.fullName}"?`)) return;
    this.api.deactivate(c.id).subscribe({
      next: () => { this.notify.success(`${c.fullName} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
