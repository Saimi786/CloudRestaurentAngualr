import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { StockApi } from '../../core/api/stock.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, StockMovementDto, StockMovementType } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Stock Movements</h1>
        <p class="muted">Audit trail of every stock change. Each row records the original quantity and its normalized value in the product's unit.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="branchFilter" (ngModelChange)="reload()">
          <option value="">All branches</option>
          @for (b of branches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
        <select [(ngModel)]="typeFilter" (ngModelChange)="reload()">
          <option value="">All types</option>
          <option [value]="0">Purchase</option>
          <option [value]="1">Adjustment</option>
          <option [value]="2">Wastage</option>
          <option [value]="3">Sale</option>
          <option [value]="4">Transfer In</option>
          <option [value]="5">Transfer Out</option>
        </select>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager') || auth.hasRole('InventoryManager')) {
          <a class="btn btn-primary" routerLink="/inventory/movements/new">+ Record Movement</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Branch</th>
          <th>Product</th>
          <th>Type</th>
          <th style="text-align:right;">Entered</th>
          <th style="text-align:right;">Normalized</th>
          <th>Reference</th>
          <th>By</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="8" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="8" class="empty">No movements yet.</td></tr>
        } @else {
          @for (m of rows(); track m.id) {
            <tr>
              <td class="muted">{{ m.occurredAt | date:'short' }}</td>
              <td>{{ m.branchName }}</td>
              <td>
                <div>{{ m.productName }}</div>
                <div class="mono muted" style="font-size:0.75rem;">{{ m.productSku }}</div>
              </td>
              <td><span class="type-pill type-{{ m.typeName.toLowerCase() }}">{{ m.typeName }}</span></td>
              <td class="mono" style="text-align:right;" [class.negative]="m.quantity < 0" [class.positive]="m.quantity > 0">
                {{ m.quantity | number:'1.0-3' }} {{ m.unitCode }}
              </td>
              <td class="mono" style="text-align:right;" [class.negative]="m.quantityInProductUnit < 0" [class.positive]="m.quantityInProductUnit > 0">
                {{ m.quantityInProductUnit | number:'1.0-3' }} {{ m.productUnitCode }}
              </td>
              <td class="mono">{{ m.reference || '—' }}</td>
              <td class="muted">{{ m.createdBy || '—' }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .negative { color: #b91c1c; }
    .positive { color: #166534; }
    select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .type-pill {
      display: inline-block;
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #eef2ff;
      color: #3730a3;
    }
    .type-purchase   { background: #dcfce7; color: #166534; }
    .type-wastage    { background: #fee2e2; color: #991b1b; }
    .type-adjustment { background: #fef3c7; color: #92400e; }
    .type-sale       { background: #f3e8ff; color: #6b21a8; }
  `]
})
export class StockMovementsComponent {
  private readonly api = inject(StockApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<StockMovementDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);
  protected branchFilter = '';
  protected typeFilter: '' | StockMovementType = '';

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.movements({
      branchId: this.branchFilter || undefined,
      type: this.typeFilter === '' ? undefined : Number(this.typeFilter) as StockMovementType
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }
}
