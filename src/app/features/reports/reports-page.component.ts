import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ExpenseByCategoryDto,
  ProfitAndLossDto,
  ReportsApi,
  TaxSummaryDto
} from '../../core/api/reports.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { SalesSummaryDto, StockValuationDto, TopProductRow } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isoDate(d: Date): string { return d.toISOString(); }

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Reports</h1>
        <p class="muted">Sales summary by day, top-selling products, and stock valuation.</p>
      </div>
    </div>

    <div class="panel">
      <div class="form-row">
        <div class="field">
          <label>From</label>
          <input type="date" [(ngModel)]="fromDate" />
        </div>
        <div class="field">
          <label>To (exclusive)</label>
          <input type="date" [(ngModel)]="toDate" />
        </div>
        <div class="field" style="align-self:end;">
          <button class="btn btn-primary" (click)="loadAll()" [disabled]="loading()">
            {{ loading() ? 'Loading…' : 'Run' }}
          </button>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Sales summary</h2>
        @if (sales(); as s) {
          <table class="kv">
            <tbody>
              <tr><td>Orders</td><td class="amt">{{ s.orderCount }}</td></tr>
              <tr><td>Subtotal</td><td class="amt">{{ s.subtotalTotal | number:'1.2-2' }}</td></tr>
              <tr><td>Tax</td><td class="amt">{{ s.taxTotal | number:'1.2-2' }}</td></tr>
              <tr><td>Discount</td><td class="amt">{{ s.discountTotal | number:'1.2-2' }}</td></tr>
              <tr><td>Grand total</td><td class="amt"><strong>{{ s.grandTotal | number:'1.2-2' }}</strong></td></tr>
              <tr><td>Refunds</td><td class="amt">−{{ s.refundTotal | number:'1.2-2' }}</td></tr>
              <tr class="row-total"><td>Net revenue</td><td class="amt"><strong>{{ s.netRevenue | number:'1.2-2' }}</strong></td></tr>
            </tbody>
          </table>

          <h3 style="margin-top:1.5rem;">By day</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Day</th>
                <th style="text-align:right;">Orders</th>
                <th style="text-align:right;">Subtotal</th>
                <th style="text-align:right;">Tax</th>
                <th style="text-align:right;">Discount</th>
                <th style="text-align:right;">Grand</th>
              </tr>
            </thead>
            <tbody>
              @for (d of s.byDay; track d.day) {
                <tr>
                  <td>{{ d.day | date:'mediumDate' }}</td>
                  <td style="text-align:right;">{{ d.orderCount }}</td>
                  <td style="text-align:right;" class="mono">{{ d.subtotal | number:'1.2-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ d.tax | number:'1.2-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ d.discount | number:'1.2-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ d.grand | number:'1.2-2' }}</td>
                </tr>
              }
              @if (s.byDay.length === 0) {
                <tr><td colspan="6" class="empty">No sales in this range.</td></tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <h2>Top products</h2>
        @if (topProducts(); as list) {
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              @for (p of list; track p.productId) {
                <tr>
                  <td class="mono">{{ p.sku }}</td>
                  <td>{{ p.name }}</td>
                  <td style="text-align:right;" class="mono">{{ p.quantitySold | number:'1.0-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ p.revenue | number:'1.2-2' }}</td>
                </tr>
              }
              @if (list.length === 0) {
                <tr><td colspan="4" class="empty">No data.</td></tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Profit &amp; Loss</h2>
        @if (pnl(); as p) {
          <table class="kv">
            <tbody>
              <tr class="section"><td colspan="2"><strong>Revenue</strong></td></tr>
              @for (r of p.revenueAccounts; track r.code) {
                <tr><td>{{ r.code }} — {{ r.name }}</td><td class="amt mono">{{ r.amount | number:'1.2-2' }}</td></tr>
              }
              @if (p.revenueAccounts.length === 0) {
                <tr><td colspan="2" class="muted">No revenue in this period.</td></tr>
              }
              <tr class="row-total"><td>Total revenue</td><td class="amt mono"><strong>{{ p.totalRevenue | number:'1.2-2' }}</strong></td></tr>
              <tr class="section"><td colspan="2"><strong>Expense</strong></td></tr>
              @for (e of p.expenseAccounts; track e.code) {
                <tr><td>{{ e.code }} — {{ e.name }}</td><td class="amt mono">{{ e.amount | number:'1.2-2' }}</td></tr>
              }
              @if (p.expenseAccounts.length === 0) {
                <tr><td colspan="2" class="muted">No expense in this period.</td></tr>
              }
              <tr class="row-total"><td>Total expense</td><td class="amt mono"><strong>{{ p.totalExpense | number:'1.2-2' }}</strong></td></tr>
              <tr class="row-net" [class.profit]="p.netIncome >= 0" [class.loss]="p.netIncome < 0">
                <td>Net income</td>
                <td class="amt mono"><strong>{{ p.netIncome | number:'1.2-2' }}</strong></td>
              </tr>
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <h2>Tax Summary</h2>
        @if (tax(); as t) {
          <table class="kv">
            <tbody>
              <tr><td>Orders</td><td class="amt">{{ t.orderCount }}</td></tr>
              <tr><td>Taxable sales</td><td class="amt mono">{{ t.totalTaxableSales | number:'1.2-2' }}</td></tr>
              <tr class="row-total"><td>Tax collected</td><td class="amt mono"><strong>{{ t.totalTaxCollected | number:'1.2-2' }}</strong></td></tr>
            </tbody>
          </table>
          <h3 style="margin-top:1rem;">By rate</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rate %</th>
                <th style="text-align:right;">Taxable sales</th>
                <th style="text-align:right;">Tax</th>
              </tr>
            </thead>
            <tbody>
              @for (r of t.byRate; track r.ratePercentage) {
                <tr>
                  <td class="mono">{{ r.ratePercentage | number:'1.0-2' }}%</td>
                  <td style="text-align:right;" class="mono">{{ r.taxableSales | number:'1.2-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ r.taxCollected | number:'1.2-2' }}</td>
                </tr>
              }
              @if (t.byRate.length === 0) {
                <tr><td colspan="3" class="empty">No taxed sales in this range.</td></tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <div class="panel">
      <h2>Expense by Category</h2>
      @if (expenses(); as e) {
        <p>
          <strong>Total:</strong> <span class="mono">{{ e.grand | number:'1.2-2' }}</span>
          across <strong>{{ e.totalCount }}</strong> {{ e.totalCount === 1 ? 'expense' : 'expenses' }}
        </p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Name</th>
              <th style="text-align:right;">Count</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (r of e.byCategory; track r.accountId) {
              <tr>
                <td class="mono">{{ r.accountCode }}</td>
                <td>{{ r.accountName }}</td>
                <td style="text-align:right;">{{ r.count }}</td>
                <td style="text-align:right;" class="mono">{{ r.total | number:'1.2-2' }}</td>
              </tr>
            }
            @if (e.byCategory.length === 0) {
              <tr><td colspan="4" class="empty">No expenses in this range.</td></tr>
            }
          </tbody>
        </table>
      }
    </div>

    <div class="panel">
      <h2>Stock valuation</h2>
      @if (stock(); as v) {
        <p>
          <strong>Total at cost:</strong>
          <span class="mono">{{ v.totalValue | number:'1.2-2' }}</span>
          <small class="muted">  · only counts products with a cost price set.</small>
        </p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>SKU</th>
              <th>Product</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Unit cost</th>
              <th style="text-align:right;">Value</th>
            </tr>
          </thead>
          <tbody>
            @for (r of v.rows; track r.productId + r.branchId) {
              <tr>
                <td>{{ r.branchName }}</td>
                <td class="mono">{{ r.sku }}</td>
                <td>{{ r.name }}</td>
                <td style="text-align:right;" class="mono">{{ r.quantity | number:'1.0-2' }}</td>
                <td style="text-align:right;" class="mono">
                  {{ r.unitCost != null ? (r.unitCost | number:'1.2-2') : '—' }}
                </td>
                <td style="text-align:right;" class="mono">
                  {{ r.value != null ? (r.value | number:'1.2-2') : '—' }}
                </td>
              </tr>
            }
            @if (v.rows.length === 0) {
              <tr><td colspan="6" class="empty">No stock on hand.</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    .kv { width: 100%; border-collapse: collapse; }
    .kv td { padding: 0.4rem 0.5rem; }
    .kv td.amt { text-align: right; font-family: ui-monospace, monospace; }
    .kv .row-total td { border-top: 1px solid #d1d5db; padding-top: 0.7rem; font-weight: 600; }
    .kv .section td { padding-top: 0.7rem; color: #4b5563; }
    .kv .row-net td { border-top: 2px solid #111; padding-top: 0.7rem; }
    .kv .row-net.profit td { color: #059669; }
    .kv .row-net.loss td { color: #dc2626; }
  `]
})
export class ReportsPageComponent {
  private readonly api = inject(ReportsApi);
  private readonly notify = inject(NotificationService);

  protected readonly sales = signal<SalesSummaryDto | null>(null);
  protected readonly topProducts = signal<TopProductRow[] | null>(null);
  protected readonly stock = signal<StockValuationDto | null>(null);
  protected readonly pnl = signal<ProfitAndLossDto | null>(null);
  protected readonly tax = signal<TaxSummaryDto | null>(null);
  protected readonly expenses = signal<ExpenseByCategoryDto | null>(null);
  protected readonly loading = signal(false);

  protected fromDate: string;
  protected toDate: string;

  constructor() {
    const today = startOfDay(new Date());
    const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    this.fromDate = monthAgo.toISOString().substring(0, 10);
    this.toDate = tomorrow.toISOString().substring(0, 10);
    this.loadAll();
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    const from = isoDate(new Date(this.fromDate));
    const to = isoDate(new Date(this.toDate));
    this.loading.set(true);
    let pending = 6;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.api.salesSummary(from, to).subscribe({
      next: r => { this.sales.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
    this.api.topProducts(from, to).subscribe({
      next: r => { this.topProducts.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
    this.api.stockValuation().subscribe({
      next: r => { this.stock.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
    this.api.profitAndLoss(from, to).subscribe({
      next: r => { this.pnl.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
    this.api.taxSummary(from, to).subscribe({
      next: r => { this.tax.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
    this.api.expenseByCategory(from, to).subscribe({
      next: r => { this.expenses.set(r); done(); },
      error: err => { this.notify.error(userMessage(err)); done(); }
    });
  }
}
