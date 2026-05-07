import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { StockApi } from '../../core/api/stock.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, StockBalanceDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-stock-balances',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Stock Balances</h1>
        <p class="muted">Current quantity of stock-tracked products at each branch, in the product's primary unit.</p>
      </div>
      <div class="actions">
        <input class="search" type="search" placeholder="Search SKU or name…"
               [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
        <select [(ngModel)]="branchFilter" (ngModelChange)="reload()">
          <option value="">All branches</option>
          @for (b of branches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager') || auth.hasRole('InventoryManager')) {
          <a class="btn btn-primary" routerLink="/inventory/movements/new">+ Record Movement</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>SKU</th>
          <th>Product</th>
          <th style="text-align:right;">Quantity</th>
          <th>Last Movement</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="5" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="5" class="empty">No stock balances. Enable "Stock Tracked" on a Product, then record a Purchase movement.</td></tr>
        } @else {
          @for (b of rows(); track b.id) {
            <tr>
              <td>{{ b.branchName }}</td>
              <td class="mono">{{ b.productSku }}</td>
              <td>{{ b.productName }}</td>
              <td class="mono" style="text-align:right;" [class.negative]="b.quantity < 0">
                {{ b.quantity | number:'1.0-3' }} {{ b.productUnitCode }}
              </td>
              <td class="muted">{{ b.lastMovementAt | date:'short' }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .negative { color: #b91c1c; font-weight: 600; }
    select, .search {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .search { min-width: 200px; }
  `]
})
export class StockBalancesComponent {
  private readonly api = inject(StockApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<StockBalanceDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);
  protected branchFilter = '';
  protected search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.reload();
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }

  reload(): void {
    this.loading.set(true);
    this.api.balances({
      branchId: this.branchFilter || undefined,
      search: this.search || undefined
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }
}
