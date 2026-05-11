import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RefundsApi } from '../../core/api/refunds.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { OrderDto, PaymentMethod, RefundDto, RefundLineInput } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

interface LineState {
  orderLineId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  refundQty: number;
  restock: boolean;
}

@Component({
  selector: 'app-refund-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop no-print" (click)="cancel()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>Refund — {{ order().orderNumber || order().id.substring(0, 8) }}</h2>

        <div class="muted">Already refunded: {{ alreadyRefunded() }} of {{ order().grandTotalAmount }}</div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 24px;"></th>
              <th>Item</th>
              <th style="text-align:right;">Qty sold</th>
              <th style="text-align:right;">Refund qty</th>
              <th style="text-align:center;">Restock?</th>
              <th style="text-align:right;">Line</th>
            </tr>
          </thead>
          <tbody>
            @for (l of lines(); track l.orderLineId) {
              <tr [class.selected]="l.selected">
                <td>
                  <input type="checkbox" [(ngModel)]="l.selected" (ngModelChange)="recompute()" />
                </td>
                <td>{{ l.productName }}</td>
                <td style="text-align:right;" class="mono">{{ l.quantity }}</td>
                <td style="text-align:right;">
                  <input class="qty-input" type="number" min="0" [max]="l.quantity" step="1"
                         [disabled]="!l.selected"
                         [(ngModel)]="l.refundQty"
                         (ngModelChange)="recompute()" />
                </td>
                <td style="text-align:center;">
                  <input type="checkbox" [(ngModel)]="l.restock" [disabled]="!l.selected" />
                </td>
                <td style="text-align:right;" class="mono">
                  {{ (l.refundQty * l.unitPrice).toFixed(2) }}
                </td>
              </tr>
            }
          </tbody>
        </table>

        <div class="form-row" style="margin-top:1rem;">
          <div class="field">
            <label>Method</label>
            <select [(ngModel)]="method">
              <option [value]="PaymentMethod.Cash">Cash</option>
              <option [value]="PaymentMethod.Card">Card</option>
              <option [value]="PaymentMethod.BankTransfer">Bank</option>
              <option [value]="PaymentMethod.Wallet">Wallet</option>
            </select>
          </div>
          <div class="field">
            <label>Refund amount</label>
            <input type="number" min="0.01" step="0.01" [(ngModel)]="amount" />
            <small class="muted">Defaults to selected lines × unit price.</small>
          </div>
          <div class="field" style="flex:2;">
            <label>Reason</label>
            <input [(ngModel)]="reason" maxlength="500" />
          </div>
        </div>

        <div class="form-actions">
          <button class="btn" (click)="cancel()">Cancel</button>
          <button class="btn btn-danger" (click)="submit()" [disabled]="saving() || amount <= 0">
            {{ saving() ? 'Refunding…' : 'Issue Refund — ' + amount.toFixed(2) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
    }
    .modal {
      background: #fff; padding: 1.5rem; border-radius: 8px;
      max-width: 720px; width: 95%; max-height: 90vh; overflow: auto;
      font-family: system-ui, sans-serif; font-size: 0.9rem;
    }
    .modal h2 { margin-top: 0; }
    .qty-input { width: 80px; text-align: right; }
    tr.selected td { background: #fffbeb; }
    .mono { font-family: ui-monospace, monospace; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 140px; }
    .field input, .field select { padding: 0.4rem 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
  `]
})
export class RefundDialogComponent {
  private readonly api = inject(RefundsApi);
  private readonly notify = inject(NotificationService);

  readonly order = input.required<OrderDto>();
  readonly previousRefundsTotal = input(0);

  readonly closed = output<RefundDto | null>();

  protected readonly PaymentMethod = PaymentMethod;
  protected readonly saving = signal(false);

  protected readonly lines = signal<LineState[]>([]);
  protected method: PaymentMethod = PaymentMethod.Cash;
  protected amount = 0;
  protected reason = '';

  protected readonly alreadyRefunded = computed(() => this.previousRefundsTotal().toFixed(2));

  constructor() {
    queueMicrotask(() => {
      const o = this.order();
      this.lines.set(o.lines.map(l => ({
        orderLineId: l.id,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPriceAmount,
        selected: false,
        refundQty: l.quantity,
        restock: false
      })));
      // Default to "refund balance after prior refunds"
      this.amount = Math.max(0, o.grandTotalAmount - this.previousRefundsTotal());
      this.method = o.payments[0]?.method ?? PaymentMethod.Cash;
    });
  }

  recompute(): void {
    const sum = this.lines()
      .filter(l => l.selected)
      .reduce((s, l) => s + l.refundQty * l.unitPrice, 0);
    if (sum > 0) this.amount = +sum.toFixed(2);
  }

  cancel(): void { this.closed.emit(null); }

  submit(): void {
    const o = this.order();
    if (this.amount <= 0) { this.notify.error('Refund amount must be > 0.'); return; }

    const refundLines: RefundLineInput[] = this.lines()
      .filter(l => l.selected && l.refundQty > 0)
      .map(l => ({ orderLineId: l.orderLineId, quantity: l.refundQty, restock: l.restock }));

    this.saving.set(true);
    this.api.create(o.id, {
      amount: this.amount,
      method: Number(this.method) as PaymentMethod,
      reason: this.reason.trim() || null,
      lines: refundLines.length > 0 ? refundLines : null
    }).subscribe({
      next: r => {
        this.saving.set(false);
        this.notify.success(`Refunded ${r.amount.toFixed(2)} ${r.currency}.`);
        this.closed.emit(r);
      },
      error: err => {
        this.saving.set(false);
        const handled = applyServerErrors({ get: () => null } as any, err);
        if (!handled) this.notify.error(userMessage(err));
      }
    });
  }
}
