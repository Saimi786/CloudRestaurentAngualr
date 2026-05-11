import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomersApi } from '../../core/api/customers.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { ContactType, CustomerDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Suppliers</h1>
        <p class="muted">Vendors you buy from. Filtered view of Contacts where Type = Supplier or Both.</p>
      </div>
      <div class="actions">
        <input class="search" type="search" placeholder="Search…"
               [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/suppliers/new">+ New Supplier</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Business</th>
          <th>Contact name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Tax #</th>
          <th style="text-align:right;">Balance</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="7" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="7" class="empty">No suppliers yet.</td></tr>
        } @else {
          @for (c of rows(); track c.id) {
            <tr>
              <td>{{ c.supplierBusinessName || c.fullName }}</td>
              <td>{{ c.fullName }}</td>
              <td>{{ c.phone || '—' }}</td>
              <td>{{ c.email || '—' }}</td>
              <td class="mono">{{ c.taxNumber || '—' }}</td>
              <td style="text-align:right;" class="mono">
                {{ c.currentBalanceAmount | number:'1.2-2' }} {{ c.currentBalanceCurrency }}
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/customers', c.id]">Edit</a>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>

    <p class="muted" style="margin-top:1rem;">
      Note: suppliers are stored in the same Contacts table as customers (UltimatePOS-style unified contact).
      Use the Customer edit screen to change Type or business name.
    </p>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class SuppliersListComponent {
  private readonly api = inject(CustomersApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<CustomerDto[]>([]);
  protected readonly loading = signal(true);
  protected search = '';

  private timer: any;

  constructor() { this.reload(); }

  onSearchChange(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reload(), 250);
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({ search: this.search, type: ContactType.Supplier }).subscribe({
      next: list => {
        // Also pull "Both" contacts so dual-purpose vendors show up.
        this.api.list({ search: this.search, type: ContactType.Both }).subscribe({
          next: both => {
            const byId = new Map<string, CustomerDto>();
            for (const c of list) byId.set(c.id, c);
            for (const c of both) byId.set(c.id, c);
            this.rows.set([...byId.values()].sort((a, b) =>
              (a.supplierBusinessName ?? a.fullName).localeCompare(b.supplierBusinessName ?? b.fullName)));
            this.loading.set(false);
          },
          error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
        });
      },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }
}
