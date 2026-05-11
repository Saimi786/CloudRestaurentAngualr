import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { PurchaseOrderStatus, PurchaseOrderSummaryDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-purchase-orders-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Purchase Orders</h1>
        <p class="muted">Buy stock from suppliers. Goes Draft → Sent → (Partial)Received → Closed.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="statusFilter" (ngModelChange)="reload()">
          <option [ngValue]="null">All statuses</option>
          @for (s of statuses; track s.value) {
            <option [ngValue]="s.value">{{ s.label }}</option>
          }
        </select>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager') || auth.hasRole('InventoryManager')) {
          <a class="btn btn-primary" routerLink="/purchase-orders/new">+ New PO</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Number</th>
          <th>Supplier</th>
          <th>Status</th>
          <th>Expected</th>
          <th style="text-align:right;">Total</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No purchase orders.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr>
              <td>
                <a [routerLink]="['/purchase-orders', r.id]" class="mono">{{ r.number }}</a>
              </td>
              <td>{{ r.supplierName }}</td>
              <td>
                <span class="badge" [class]="statusClass(r.status)">{{ r.statusName }}</span>
              </td>
              <td>{{ r.expectedDate || '—' }}</td>
              <td style="text-align:right;" class="mono">{{ r.grandTotalAmount | number:'1.2-2' }} {{ r.currency }}</td>
              <td>{{ r.createdAt | date:'short' }}</td>
            </tr>
          }
        }
      </tbody>
    </table>

    <p class="muted" style="margin-top:1rem;">
      <a routerLink="/supplier-bills">View supplier bills →</a>
    </p>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class PurchaseOrdersListComponent {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<PurchaseOrderSummaryDto[]>([]);
  protected readonly loading = signal(true);
  protected statusFilter: PurchaseOrderStatus | null = null;

  protected readonly statuses = [
    { value: PurchaseOrderStatus.Draft, label: 'Draft' },
    { value: PurchaseOrderStatus.Sent, label: 'Sent' },
    { value: PurchaseOrderStatus.PartialReceived, label: 'Partial' },
    { value: PurchaseOrderStatus.Closed, label: 'Closed' },
    { value: PurchaseOrderStatus.Cancelled, label: 'Cancelled' }
  ];

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list({ status: this.statusFilter ?? undefined }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  statusClass(s: PurchaseOrderStatus): string {
    switch (s) {
      case PurchaseOrderStatus.Draft: return 'badge-inactive';
      case PurchaseOrderStatus.Sent: return 'badge-active';
      case PurchaseOrderStatus.PartialReceived: return 'badge-active';
      case PurchaseOrderStatus.Closed: return '';
      case PurchaseOrderStatus.Cancelled: return 'badge-inactive';
    }
  }
}
