import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { OrdersApi } from '../../core/api/orders.api';
import { RefundsApi } from '../../core/api/refunds.api';
import { TenantsApi } from '../../core/api/tenants.api';
import { environment } from '../../../environments/environment';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, OrderDto, OrderStatus, ReceiptTemplate, RefundDto, TenantDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';
import { RefundDialogComponent } from './refund-dialog.component';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, RefundDialogComponent],
  template: `
    @if (order(); as o) {
      <div class="receipt-actions no-print">
        <button class="btn btn-primary" (click)="print()">🖨 Print</button>
        @if (canRefund()) {
          <button class="btn btn-danger" (click)="openRefund()">↩ Refund</button>
        }
        <button class="btn" (click)="closeWindow()">Close</button>
      </div>
      <div class="receipt" [class.classic]="isClassic()">
        <div class="header">
          @if (logoSrc()) { <img class="logo" [src]="logoSrc()" alt="logo" /> }
          <div class="brand">{{ tenant()?.name || 'CloudRestaurent' }}</div>
          <div class="branch">{{ o.branchName }}</div>
          @if (isClassic() && branch(); as b) {
            <div class="addr">
              {{ b.location.addressLine1 }}{{ b.location.city ? ', ' + b.location.city : '' }}
              @if (b.phoneNumber) { · {{ b.phoneNumber }} }
            </div>
          }
        </div>
        <hr />
        <div class="meta">
          <div><span class="muted">Order #</span><strong>{{ o.orderNumber || o.id.substring(0, 8) }}</strong></div>
          <div><span class="muted">Date </span>{{ o.openedAt | date:'medium' }}</div>
          @if (o.tableCode) { <div><span class="muted">Table </span>{{ o.tableCode }}</div> }
          @if (o.customerName) { <div><span class="muted">Customer </span>{{ o.customerName }}</div> }
          <div><span class="muted">Type </span>{{ o.typeName }}</div>
        </div>
        <hr />
        <table class="lines">
          <tbody>
            @for (l of o.lines; track l.id) {
              <tr class="line-main">
                <td class="qty">{{ l.quantity }}×</td>
                <td class="name">{{ l.productName }}</td>
                <td class="amt mono">{{ l.subtotal | number:'1.2-2' }}</td>
              </tr>
              @for (m of l.modifiers; track m.id) {
                <tr class="line-mod">
                  <td></td>
                  <td class="name">+ {{ m.name }}</td>
                  <td class="amt mono">@if (m.priceAdjustmentAmount > 0) { {{ m.priceAdjustmentAmount | number:'1.2-2' }} }</td>
                </tr>
              }
              @if (l.taxAmount > 0) {
                <tr class="line-tax">
                  <td></td>
                  <td class="name muted small">Tax {{ l.taxRatePercentage }}%</td>
                  <td class="amt mono muted small">{{ l.taxAmount | number:'1.2-2' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
        <hr />
        <div class="totals">
          <div class="row"><span>Subtotal</span><span class="mono">{{ o.subtotalAmount | number:'1.2-2' }}</span></div>
          @if (o.taxAmount > 0) {
            <div class="row"><span>Tax</span><span class="mono">{{ o.taxAmount | number:'1.2-2' }}</span></div>
          }
          @if (o.discountAmount > 0) {
            <div class="row"><span>Discount</span><span class="mono">−{{ o.discountAmount | number:'1.2-2' }}</span></div>
          }
          <div class="row grand"><span>TOTAL</span><span class="mono">{{ o.grandTotalAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
        </div>
        <hr />
        @if (o.payments.length > 0) {
          <div class="payments">
            @for (p of o.payments; track p.id) {
              <div class="row">
                <span>{{ p.methodName }}@if (p.reference) { <span class="muted small"> · {{ p.reference }}</span> }</span>
                <span class="mono">{{ p.amount | number:'1.2-2' }}</span>
              </div>
            }
            @if (o.balance > 0.001) {
              <div class="row balance"><span>Balance Due</span><span class="mono">{{ o.balance | number:'1.2-2' }}</span></div>
            } @else if (o.balance < -0.001) {
              <div class="row"><span>Change</span><span class="mono">{{ -o.balance | number:'1.2-2' }}</span></div>
            }
          </div>
          <hr />
        }
        @if (refunds().length > 0) {
          <div class="payments">
            @for (r of refunds(); track r.id) {
              <div class="row" style="color:#b91c1c;">
                <span>Refund — {{ r.methodName }}</span>
                <span class="mono">−{{ r.amount | number:'1.2-2' }}</span>
              </div>
            }
            <div class="row balance">
              <span>Net</span>
              <span class="mono">{{ (o.grandTotalAmount - refundedTotal()) | number:'1.2-2' }}</span>
            </div>
          </div>
          <hr />
        }
        @if (o.notes) { <div class="notes"><em>{{ o.notes }}</em></div><hr /> }
        <div class="footer">
          <div>{{ branch()?.receiptFooterText || 'Thank you — please come again' }}</div>
          <div class="muted small">{{ o.statusName }}</div>
        </div>
      </div>

      @if (showRefundDialog()) {
        <app-refund-dialog
          [order]="o"
          [previousRefundsTotal]="refundedTotal()"
          (closed)="onRefundClosed($event)" />
      }
    } @else if (loading()) {
      <div class="receipt-loading">Loading receipt…</div>
    } @else {
      <div class="receipt-loading">Receipt not found.</div>
    }
  `,
  styles: [`
    :host {
      display: block;
      background: #f3f4f6;
      min-height: 100vh;
      padding: 1.5rem;
      font-family: ui-monospace, 'Courier New', monospace;
    }
    .receipt-actions {
      max-width: 320px;
      margin: 0 auto 1rem;
      display: flex;
      gap: 0.5rem;
    }
    .receipt {
      max-width: 320px;          /* ~80mm thermal width — Compact default */
      margin: 0 auto;
      background: #fff;
      padding: 1rem;
      border: 1px solid #d1d5db;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .receipt.classic {
      max-width: 720px;          /* ~A4 / Letter — Classic layout */
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 0.95rem;
      padding: 2rem 2.5rem;
    }
    .receipt.classic hr { border-top: 1px solid #d1d5db; }
    .receipt.classic .brand { font-size: 1.5rem; }
    .receipt.classic .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 1rem; font-size: 0.9rem; }
    .receipt.classic .meta div { display: contents; }
    .receipt.classic .lines { font-size: 0.95rem; }
    .receipt.classic .lines .qty { width: 50px; }
    .receipt.classic .totals .row { padding: 0.25rem 0; }
    .receipt.classic .totals .grand { font-size: 1.25rem; }
    .receipt.classic .footer { padding: 1.5rem 0 0; font-size: 1rem; }
    .header { text-align: center; }
    .logo { max-width: 120px; max-height: 80px; margin: 0 auto 0.4rem; display: block; }
    .receipt.classic .logo { max-width: 180px; max-height: 120px; }
    .brand { font-size: 1.05rem; font-weight: 800; letter-spacing: 0.05em; }
    .branch { font-size: 0.85rem; }
    .addr { font-size: 0.85rem; color: #4b5563; margin-top: 0.2rem; }
    hr { border: 0; border-top: 1px dashed #9ca3af; margin: 0.6rem 0; }
    .meta div { display: flex; gap: 0.4rem; font-size: 0.78rem; }
    .meta .muted { color: #6b7280; min-width: 60px; }
    .lines { width: 100%; border-collapse: collapse; }
    .lines td { padding: 0.15rem 0; vertical-align: top; }
    .qty { width: 28px; }
    .amt { text-align: right; white-space: nowrap; padding-left: 0.4rem; }
    .line-mod .name { padding-left: 0.6rem; color: #6b7280; font-size: 0.78rem; }
    .line-tax .name, .line-tax .amt { font-size: 0.72rem; }
    .totals .row, .payments .row {
      display: flex; justify-content: space-between;
      padding: 0.15rem 0;
    }
    .totals .grand {
      font-weight: 800; font-size: 1.05rem;
      border-top: 1px solid #000; margin-top: 0.4rem; padding-top: 0.4rem;
    }
    .payments .balance { font-weight: 700; color: #b91c1c; }
    .notes { font-size: 0.8rem; padding: 0.3rem 0; }
    .footer { text-align: center; font-size: 0.85rem; padding: 0.6rem 0 0; }
    .small { font-size: 0.75rem; }
    .muted { color: #6b7280; }
    .mono { font-family: ui-monospace, 'Courier New', monospace; }
    .receipt-loading { text-align: center; padding: 3rem; color: #6b7280; }

    @media print {
      :host { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .receipt {
        max-width: 100%;
        border: 0;
        box-shadow: none;
        padding: 0.25rem;
      }
      hr { border-top-color: #000; }
    }
  `]
})
export class ReceiptComponent {
  private readonly api = inject(OrdersApi);
  private readonly refundsApi = inject(RefundsApi);
  private readonly tenantsApi = inject(TenantsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  protected readonly order = signal<OrderDto | null>(null);
  protected readonly tenant = signal<TenantDto | null>(null);
  protected readonly branch = signal<BranchDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly refunds = signal<RefundDto[]>([]);
  protected readonly showRefundDialog = signal(false);

  protected readonly refundedTotal = computed(() =>
    this.refunds().reduce((sum, r) => sum + r.amount, 0));

  protected readonly canRefund = computed(() => {
    const o = this.order();
    if (!o || o.status !== OrderStatus.Closed) return false;
    return this.refundedTotal() < o.grandTotalAmount - 0.01;
  });

  protected readonly isClassic = computed(() =>
    this.branch()?.receiptTemplate === ReceiptTemplate.Classic);

  // Logo URLs come back relative (/uploads/...) — prefix with API origin so the
  // print window resolves them correctly.
  protected readonly logoSrc = computed(() => {
    const t = this.tenant();
    if (!t?.logoUrl) return null;
    if (t.logoUrl.startsWith('http')) return t.logoUrl;
    const origin = environment.apiBaseUrl.replace(/\/api\/v\d+\/?$/, '');
    return origin + t.logoUrl;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.tenantsApi.getCurrent().subscribe({
      next: t => this.tenant.set(t),
      error: () => {}
    });

    this.api.get(id).subscribe({
      next: o => {
        this.order.set(o);
        this.loading.set(false);
        if (o.branchId) {
          this.branchesApi.get(o.branchId).subscribe({
            next: b => this.branch.set(b),
            error: () => {}
          });
        }
        if (o.status === OrderStatus.Closed) this.loadRefunds(o.id);
        // If opened in a fresh window, auto-trigger the print dialog after the layout
        // settles. Users hitting Refresh see the receipt without a re-print prompt.
        // Delay slightly longer for Classic so the branch fetch lands first.
        if (window.opener) setTimeout(() => window.print(), 400);
      },
      error: err => {
        this.loading.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }

  loadRefunds(orderId: string): void {
    this.refundsApi.list(orderId).subscribe({
      next: list => this.refunds.set(list),
      error: () => {}
    });
  }

  openRefund(): void { this.showRefundDialog.set(true); }

  onRefundClosed(refund: RefundDto | null): void {
    this.showRefundDialog.set(false);
    const o = this.order();
    if (refund && o) this.loadRefunds(o.id);
  }

  print(): void { window.print(); }
  closeWindow(): void { window.close(); }
}
