import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import {
  BillMatchStatus, SupplierBillDto, SupplierBillPaymentMethod, SupplierBillStatus
} from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-supplier-bills-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Supplier Bills</h1>
        <p class="muted">Bills (AP). Auto-created from PO close. 3-way matched against PO receipts.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="statusFilter" (ngModelChange)="reload()">
          <option [ngValue]="null">All statuses</option>
          <option [ngValue]="SupplierBillStatus.Open">Open</option>
          <option [ngValue]="SupplierBillStatus.PartiallyPaid">Partial</option>
          <option [ngValue]="SupplierBillStatus.Paid">Paid</option>
        </select>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Bill #</th>
          <th>Supplier</th>
          <th>PO</th>
          <th>Bill date</th>
          <th>Due</th>
          <th style="text-align:right;">Bill amount</th>
          <th style="text-align:right;">Expected</th>
          <th style="text-align:right;">Variance</th>
          <th>Match</th>
          <th>Pay status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="11" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="11" class="empty">No bills.</td></tr>
        } @else {
          @for (b of rows(); track b.id) {
            <tr [title]="b.discrepancyReason || ''">
              <td class="mono">{{ b.number }}</td>
              <td>{{ b.supplierName }}</td>
              <td>
                @if (b.purchaseOrderId) {
                  <a [routerLink]="['/purchase-orders', b.purchaseOrderId]" class="mono">{{ b.purchaseOrderNumber }}</a>
                } @else { — }
              </td>
              <td>{{ b.billDate }}</td>
              <td [class.overdue]="isOverdue(b)">{{ b.dueDate || '—' }}</td>
              <td style="text-align:right;" class="mono">{{ b.amount | number:'1.2-2' }} {{ b.currency }}</td>
              <td style="text-align:right;" class="mono">
                {{ b.expectedAmount != null ? (b.expectedAmount | number:'1.2-2') : '—' }}
              </td>
              <td style="text-align:right;" class="mono"
                  [class.text-danger]="(b.discrepancyAmount ?? 0) > 0.01"
                  [class.text-warn]="(b.discrepancyAmount ?? 0) < -0.01">
                {{ b.discrepancyAmount != null ? (b.discrepancyAmount | number:'1.2-2') : '—' }}
              </td>
              <td>
                <span class="badge" [class]="matchClass(b.matchStatus)">{{ b.matchStatusName }}</span>
              </td>
              <td><span class="badge" [class.badge-active]="b.status === SupplierBillStatus.Paid">{{ b.statusName }}</span></td>
              <td class="actions">
                @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) {
                  @if (b.purchaseOrderId) {
                    <button class="btn btn-sm" (click)="rematch(b)" title="Re-run 3-way match against PO receipts">↻ Match</button>
                  }
                  <button class="btn btn-sm" (click)="edit(b)">Edit</button>
                  @if (b.matchStatus !== BillMatchStatus.Disputed) {
                    <button class="btn btn-sm btn-danger" (click)="dispute(b)">Dispute</button>
                  }
                  @if (b.outstanding > 0.01) {
                    <button class="btn btn-sm btn-primary" (click)="pay(b)">Pay</button>
                  }
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
    .overdue { color: #b91c1c; font-weight: 600; }
    .text-danger { color: #b91c1c; }
    .text-warn { color: #b45309; }
    .match-matched { background: #dcfce7; color: #166534; }
    .match-over { background: #fee2e2; color: #991b1b; }
    .match-under { background: #fef3c7; color: #92400e; }
    .match-disputed { background: #f3e8ff; color: #6b21a8; }
    .match-none { background: #f3f4f6; color: #4b5563; }
  `]
})
export class SupplierBillsListComponent {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly SupplierBillStatus = SupplierBillStatus;
  protected readonly BillMatchStatus = BillMatchStatus;
  protected readonly rows = signal<SupplierBillDto[]>([]);
  protected readonly loading = signal(true);
  protected statusFilter: SupplierBillStatus | null = null;

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.listBills({ status: this.statusFilter ?? undefined }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  isOverdue(b: SupplierBillDto): boolean {
    if (!b.dueDate || b.outstanding <= 0.01) return false;
    return new Date(b.dueDate) < new Date();
  }

  matchClass(s: BillMatchStatus): string {
    switch (s) {
      case BillMatchStatus.Matched: return 'match-matched';
      case BillMatchStatus.OverBilled: return 'match-over';
      case BillMatchStatus.UnderBilled: return 'match-under';
      case BillMatchStatus.Disputed: return 'match-disputed';
      default: return 'match-none';
    }
  }

  rematch(b: SupplierBillDto): void {
    const tolStr = prompt(`Tolerance for ${b.number}? (default 0.01)`, '0.01');
    if (tolStr === null) return;
    const tolerance = Number(tolStr);
    if (!isFinite(tolerance) || tolerance < 0) { this.notify.error('Invalid tolerance.'); return; }
    const reason = prompt('Override / acceptance reason (optional)?', '') || null;

    this.api.matchBill(b.id, tolerance, reason).subscribe({
      next: status => {
        const label = BillMatchStatus[status];
        this.notify.success(`Match recomputed: ${label}.`);
        this.reload();
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  edit(b: SupplierBillDto): void {
    const amountStr = prompt(`Bill amount for ${b.number}?`, b.amount.toFixed(2));
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!isFinite(amount) || amount <= 0) { this.notify.error('Invalid amount.'); return; }
    const ref = prompt('Supplier invoice #?', b.supplierBillReference || '') || null;
    const billDate = prompt('Bill date (YYYY-MM-DD)?', b.billDate) || b.billDate;
    const dueDate = prompt('Due date (YYYY-MM-DD, blank = none)?', b.dueDate || '') || null;
    const notes = prompt('Notes?', b.notes || '') || null;

    this.api.updateBill(b.id, {
      amount, supplierBillReference: ref, billDate,
      dueDate: dueDate || null, notes
    }).subscribe({
      next: () => { this.notify.success('Bill updated. Re-run match if needed.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  dispute(b: SupplierBillDto): void {
    const reason = prompt(`Why is ${b.number} disputed?`, '');
    if (!reason || !reason.trim()) return;
    this.api.disputeBill(b.id, reason.trim()).subscribe({
      next: () => { this.notify.success('Marked disputed.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  pay(b: SupplierBillDto): void {
    const amountStr = prompt(`Pay ${b.number} — outstanding ${b.outstanding.toFixed(2)} ${b.currency}. Amount?`,
      b.outstanding.toFixed(2));
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!isFinite(amount) || amount <= 0) { this.notify.error('Invalid amount.'); return; }

    const methodStr = prompt('Method? (cash / card / bank / wallet)', 'bank');
    const method = methodStr?.toLowerCase().startsWith('cas') ? SupplierBillPaymentMethod.Cash
                 : methodStr?.toLowerCase().startsWith('car') ? SupplierBillPaymentMethod.Card
                 : methodStr?.toLowerCase().startsWith('wal') ? SupplierBillPaymentMethod.Wallet
                 : SupplierBillPaymentMethod.BankTransfer;
    const ref = prompt('Reference (optional)?', '') || null;

    this.api.payBill(b.id, amount, method, ref).subscribe({
      next: () => { this.notify.success('Payment recorded.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
