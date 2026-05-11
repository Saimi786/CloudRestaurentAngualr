import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchesApi } from '../../core/api/branches.api';
import { CategoriesApi } from '../../core/api/categories.api';
import { CustomersApi } from '../../core/api/customers.api';
import { ModifierGroupsApi } from '../../core/api/modifier-groups.api';
import { OrdersApi } from '../../core/api/orders.api';
import { ProductsApi } from '../../core/api/products.api';
import { TablesApi } from '../../core/api/tables.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import {
  BranchDto, CategoryDto, CustomerDto, ModifierGroupDto, OrderDto, OrderType,
  PaymentMethod, ProductDto, TableDto
} from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="pos">
      <!-- LEFT: products + filters -->
      <div class="pos-left">
        <div class="pos-toolbar">
          <select [(ngModel)]="branchId" (ngModelChange)="onBranchChange()">
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>

          <select [(ngModel)]="categoryFilter">
            <option value="">All categories</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>

          <input class="search" type="search" placeholder="Search SKU or name…"
                 [(ngModel)]="search" />
        </div>

        <div class="product-grid">
          @for (p of filteredProducts(); track p.id) {
            <button class="product-tile" type="button" (click)="onProductClick(p)" [disabled]="!order()">
              <div class="product-name">{{ p.name }}</div>
              <div class="product-sku mono">{{ p.sku }}</div>
              <div class="product-price">{{ p.basePriceAmount | number:'1.2-2' }} {{ p.basePriceCurrency }}</div>
            </button>
          }
          @if (filteredProducts().length === 0 && !loadingProducts()) {
            <div class="empty">No products match.</div>
          }
        </div>
      </div>

      <!-- RIGHT: order panel -->
      <div class="pos-right">
        @let o = order();
        @if (!o) {
          <div class="open-form panel">
            <h2>Open new order</h2>

            <div class="field">
              <label>Type</label>
              <select [(ngModel)]="newType">
                <option [value]="0">Dine-in</option>
                <option [value]="1">Takeaway</option>
                <option [value]="2">Delivery</option>
              </select>
            </div>

            @if (Number(newType) === 0) {
              <div class="field">
                <label>Table</label>
                <select [(ngModel)]="newTableId">
                  <option value="">—</option>
                  @for (t of branchTables(); track t.id) {
                    <option [value]="t.id">{{ t.code }} ({{ t.statusName }})</option>
                  }
                </select>
              </div>
            }

            <div class="field">
              <label>Customer phone (optional)</label>
              <div style="display:flex;gap:0.4rem;">
                <input type="search" placeholder="+92-300-…" [(ngModel)]="phoneLookup" style="flex:1;" />
                <button type="button" class="btn btn-sm" (click)="lookupCustomer()" [disabled]="!phoneLookup">Find</button>
              </div>
              @if (foundCustomer(); as c) {
                <small class="muted">→ {{ c.fullName }} ({{ c.loyaltyPoints }} pts)</small>
              }
            </div>

            <button type="button" class="btn btn-primary" (click)="openOrder()" [disabled]="opening()">
              {{ opening() ? 'Opening…' : 'Open order' }}
            </button>
          </div>
        } @else {
          <div class="order-panel">
            <div class="order-header">
              <div>
                <h2>{{ o.typeName }}</h2>
                <small class="muted">
                  {{ o.tableCode ? 'Table ' + o.tableCode + ' · ' : '' }}{{ o.customerName || 'Walk-in' }}
                </small>
              </div>
              @if (o.status === 0) {
                <button class="btn btn-sm" type="button" (click)="resetOrder()">+ New</button>
              }
            </div>

            <div class="order-lines">
              @if (o.lines.length === 0) {
                <div class="empty">No lines yet — click products on the left.</div>
              } @else {
                @for (line of o.lines; track line.id) {
                  <div class="order-line">
                    <div class="line-main">
                      <div>
                        <strong>{{ line.quantity }}× {{ line.productName }}</strong>
                        @if (line.modifiers.length > 0) {
                          <div class="muted line-mods">
                            @for (m of line.modifiers; track m.id) {
                              <span>+ {{ m.name }}{{ m.priceAdjustmentAmount > 0 ? ' (' + (m.priceAdjustmentAmount | number:'1.2-2') + ')' : '' }}</span>
                            }
                          </div>
                        }
                        @if (line.notes) { <div class="muted line-mods">"{{ line.notes }}"</div> }
                      </div>
                      <div style="text-align:right;">
                        <div class="mono">{{ line.subtotal | number:'1.2-2' }}</div>
                        @if (o.status === 0) {
                          <button class="btn btn-sm btn-danger" type="button" (click)="removeLine(line.id)">×</button>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>

            <div class="order-totals">
              <div class="row"><span>Subtotal</span><span class="mono">{{ o.subtotalAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
              @if (o.taxAmount > 0) {
                <div class="row"><span>Tax</span><span class="mono">{{ o.taxAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
              }
              @if (o.discountAmount > 0) {
                <div class="row"><span>Discount</span><span class="mono">−{{ o.discountAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
              }
              <div class="row total"><span>Grand Total</span><span class="mono">{{ o.grandTotalAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
              <div class="row"><span>Paid</span><span class="mono">{{ o.paidTotal | number:'1.2-2' }} {{ o.currency }}</span></div>
              <div class="row total"><span>Balance</span><span class="mono">{{ o.balance | number:'1.2-2' }} {{ o.currency }}</span></div>
            </div>

            @if (o.status === 0) {
              <div class="discount-bar">
                <button class="btn btn-sm" type="button" (click)="applyDiscount()" [disabled]="o.lines.length === 0">
                  {{ o.discountAmount > 0 ? 'Edit discount' : '− Discount' }}
                </button>
                @if (o.discountAmount > 0) {
                  <button class="btn btn-sm" type="button" (click)="clearDiscount()">Clear</button>
                }
                <span class="split-helper muted small">Split:</span>
                <button class="btn btn-sm" type="button" (click)="splitEqually(2)" [disabled]="o.balance <= 0.001">2 ways</button>
                <button class="btn btn-sm" type="button" (click)="splitEqually(3)" [disabled]="o.balance <= 0.001">3 ways</button>
                <button class="btn btn-sm" type="button" (click)="splitEqually(4)" [disabled]="o.balance <= 0.001">4 ways</button>
              </div>

              <div class="payments-form">
                <select [(ngModel)]="payMethod">
                  <option [value]="0">Cash</option>
                  <option [value]="1">Card</option>
                  <option [value]="2">Bank transfer</option>
                  <option [value]="3">Wallet</option>
                </select>
                <input type="number" step="0.01" min="0" [(ngModel)]="payAmount" placeholder="Amount" />
                <button class="btn" type="button" (click)="recordPayment()" [disabled]="!payAmount || payAmount <= 0">
                  + Pay
                </button>
              </div>

              <div class="actions">
                <button class="btn" type="button" (click)="printReceipt(o.id)" [disabled]="o.lines.length === 0">🖨 Print</button>
                <button class="btn btn-danger" type="button" (click)="voidOrder()">Void</button>
                <button class="btn btn-primary" type="button" [disabled]="o.balance > 0.001 || o.lines.length === 0" (click)="closeOrder()">
                  Close order
                </button>
              </div>
            } @else {
              <div class="closed-banner">
                Order {{ o.statusName }}
                <button class="btn btn-primary" type="button" (click)="printReceipt(o.id)" style="margin-left: auto;">🖨 Print Receipt</button>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modifier picker dialog -->
    @if (modifierPicker(); as picker) {
      <div class="modal-backdrop" (click)="cancelModifierPick()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ picker.product.name }}</h2>
          @for (g of picker.groups; track g.id) {
            <div class="mod-group">
              <div class="mod-group-header">
                {{ g.name }}
                <small class="muted">
                  ({{ g.isRequired ? 'required, ' : '' }}{{ g.minSelect }}–{{ g.maxSelect }})
                </small>
              </div>
              @for (m of g.modifiers; track m.id) {
                <label class="mod-option">
                  <input type="checkbox"
                         [checked]="picker.selected.has(m.id)"
                         (change)="toggleModifier(m.id, $any($event.target).checked, g.maxSelect)" />
                  <span>{{ m.name }}</span>
                  @if (m.priceAdjustmentAmount > 0) {
                    <span class="mono muted">+{{ m.priceAdjustmentAmount | number:'1.2-2' }}</span>
                  }
                </label>
              }
            </div>
          }
          <div class="actions">
            <button class="btn" (click)="cancelModifierPick()">Cancel</button>
            <button class="btn btn-primary" (click)="confirmModifierPick()">Add to order</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .pos { display: grid; grid-template-columns: 1fr 380px; gap: 1rem; height: calc(100vh - 100px); }
    .pos-left { display: flex; flex-direction: column; gap: 0.75rem; min-height: 0; }
    .pos-toolbar { display: flex; gap: 0.5rem; }
    .pos-toolbar select, .pos-toolbar .search {
      padding: 0.45rem 0.7rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      background: #fff;
    }
    .pos-toolbar .search { flex: 1; }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.5rem;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .product-tile {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.75rem;
      text-align: left;
      cursor: pointer;
      transition: transform 0.05s;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      &:hover:not(:disabled) { transform: translateY(-1px); border-color: #3b82f6; }
      &:active:not(:disabled) { transform: translateY(0); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .product-name { font-weight: 600; }
    .product-sku { font-size: 0.7rem; color: #6b7280; }
    .product-price { font-family: ui-monospace, monospace; color: #166534; font-weight: 600; }
    .empty { padding: 1rem; color: #9ca3af; }

    .pos-right { display: flex; flex-direction: column; }
    .open-form {
      .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
      label { font-size: 0.75rem; font-weight: 600; color: #374151; }
      select, input { padding: 0.45rem 0.7rem; border: 1px solid #d1d5db; border-radius: 6px; }
    }

    .order-panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .order-header { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
    .order-header h2 { margin: 0; font-size: 1rem; }
    .order-lines { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
    .order-line { padding: 0.5rem 1rem; border-bottom: 1px solid #f3f4f6; }
    .line-main { display: flex; justify-content: space-between; gap: 0.5rem; }
    .line-mods { font-size: 0.8rem; }
    .mono { font-family: ui-monospace, monospace; }

    .order-totals { padding: 0.75rem 1rem; border-top: 1px solid #f3f4f6; }
    .order-totals .row { display: flex; justify-content: space-between; padding: 0.15rem 0; }
    .order-totals .total { font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 0.4rem; margin-top: 0.4rem; }

    .payments-form { display: flex; gap: 0.4rem; padding: 0.75rem 1rem; border-top: 1px solid #f3f4f6; }
    .payments-form select, .payments-form input { padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
    .payments-form input { flex: 1; }

    .actions { display: flex; gap: 0.5rem; padding: 0.5rem 1rem 1rem; }
    .actions .btn-primary { flex: 1; }

    .closed-banner {
      padding: 1rem;
      background: #dcfce7;
      color: #166534;
      text-align: center;
      font-weight: 600;
      border-top: 1px solid #f3f4f6;
    }

    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      display: grid; place-items: center;
      z-index: 100;
    }
    .modal {
      background: #fff; border-radius: 8px;
      padding: 1.25rem;
      min-width: 360px; max-width: 480px; max-height: 80vh; overflow-y: auto;
    }
    .modal h2 { margin: 0 0 0.75rem; font-size: 1.1rem; }
    .mod-group { margin: 0.75rem 0; }
    .mod-group-header { font-weight: 600; margin-bottom: 0.4rem; }
    .mod-option {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 6px;
      margin-bottom: 0.3rem; cursor: pointer;
      &:hover { background: #f9fafb; }
      input { accent-color: #3b82f6; }
      .mono { margin-left: auto; }
    }
  `]
})
export class PosComponent {
  private readonly branchesApi = inject(BranchesApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly tablesApi = inject(TablesApi);
  private readonly customersApi = inject(CustomersApi);
  private readonly modGroupsApi = inject(ModifierGroupsApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly notify = inject(NotificationService);

  protected Number = Number;

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly tables = signal<TableDto[]>([]);
  protected readonly loadingProducts = signal(true);

  protected branchId = '';
  protected categoryFilter = '';
  protected search = '';

  protected newType: OrderType | number = OrderType.DineIn;
  protected newTableId = '';
  protected phoneLookup = '';
  protected readonly foundCustomer = signal<CustomerDto | null>(null);

  protected readonly opening = signal(false);
  protected readonly order = signal<OrderDto | null>(null);

  protected payMethod: PaymentMethod | number = PaymentMethod.Cash;
  protected payAmount = 0;

  protected readonly modifierPicker = signal<{
    product: ProductDto;
    groups: ModifierGroupDto[];
    selected: Set<string>;
  } | null>(null);

  protected readonly filteredProducts = computed(() => {
    let list = this.products().filter(p => p.isActive);
    if (this.categoryFilter) list = list.filter(p => p.categoryId === this.categoryFilter);
    if (this.search) {
      const s = this.search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
    }
    return list;
  });

  protected readonly branchTables = computed(() =>
    this.tables().filter(t => t.branchId === this.branchId && t.isActive));

  constructor() {
    this.branchesApi.list().subscribe(list => {
      this.branches.set(list);
      if (list.length > 0) {
        this.branchId = list[0].id;
        this.onBranchChange();
      }
    });
    this.categoriesApi.list().subscribe(list => this.categories.set(list));
    this.productsApi.list({}).subscribe({
      next: list => { this.products.set(list); this.loadingProducts.set(false); },
      error: () => this.loadingProducts.set(false)
    });
  }

  onBranchChange(): void {
    this.tablesApi.list({ branchId: this.branchId }).subscribe(list => this.tables.set(list));
  }

  lookupCustomer(): void {
    if (!this.phoneLookup) return;
    this.customersApi.getByPhone(this.phoneLookup.trim()).subscribe({
      next: c => this.foundCustomer.set(c),
      error: () => {
        this.foundCustomer.set(null);
        this.notify.info('No customer found with that phone.');
      }
    });
  }

  openOrder(): void {
    if (!this.branchId) return;
    this.opening.set(true);
    this.ordersApi.open({
      branchId: this.branchId,
      tableId: Number(this.newType) === 0 && this.newTableId ? this.newTableId : null,
      customerId: this.foundCustomer()?.id ?? null,
      type: Number(this.newType) as OrderType,
      notes: null
    }).subscribe({
      next: o => {
        this.order.set(o);
        this.opening.set(false);
        this.payAmount = o.balance;
      },
      error: err => {
        this.opening.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }

  resetOrder(): void {
    this.order.set(null);
    this.foundCustomer.set(null);
    this.phoneLookup = '';
    this.newTableId = '';
    this.payAmount = 0;
  }

  onProductClick(product: ProductDto): void {
    this.modGroupsApi.getForProduct(product.id).subscribe(groups => {
      if (groups.length === 0) {
        this.addLine(product, []);
        return;
      }
      // Load full group details (with modifiers) for the picker
      Promise.all(groups.map(g => this.modGroupsApi.get(g.id).toPromise())).then(full => {
        const groupsWithMods = full.filter((g): g is ModifierGroupDto => !!g);
        // Pre-select isDefault modifiers
        const selected = new Set<string>();
        for (const g of groupsWithMods) {
          for (const m of g.modifiers) if (m.isDefault) selected.add(m.id);
        }
        this.modifierPicker.set({ product, groups: groupsWithMods, selected });
      });
    });
  }

  toggleModifier(modifierId: string, checked: boolean, maxSelectInGroup: number): void {
    const picker = this.modifierPicker();
    if (!picker) return;
    const next = new Set(picker.selected);
    if (checked) next.add(modifierId); else next.delete(modifierId);
    this.modifierPicker.set({ ...picker, selected: next });
  }

  cancelModifierPick(): void { this.modifierPicker.set(null); }

  confirmModifierPick(): void {
    const picker = this.modifierPicker();
    if (!picker) return;
    this.addLine(picker.product, [...picker.selected]);
    this.modifierPicker.set(null);
  }

  private addLine(product: ProductDto, modifierIds: string[]): void {
    const o = this.order();
    if (!o) return;
    this.ordersApi.addLine(o.id, {
      productId: product.id,
      quantity: 1,
      notes: null,
      modifierIds
    }).subscribe({
      next: updated => { this.order.set(updated); this.payAmount = updated.balance; },
      error: err => this.notify.error(userMessage(err))
    });
  }

  removeLine(lineId: string): void {
    const o = this.order();
    if (!o) return;
    this.ordersApi.removeLine(o.id, lineId).subscribe({
      next: updated => { this.order.set(updated); this.payAmount = updated.balance; },
      error: err => this.notify.error(userMessage(err))
    });
  }

  recordPayment(): void {
    const o = this.order();
    if (!o || !this.payAmount) return;
    this.ordersApi.addPayment(o.id, {
      method: Number(this.payMethod) as PaymentMethod,
      amount: Number(this.payAmount),
      reference: null
    }).subscribe({
      next: updated => {
        this.order.set(updated);
        this.payAmount = updated.balance;
        if (updated.balance < 0.001) this.notify.success('Order is fully paid. Tap Close to finalize.');
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  closeOrder(): void {
    const o = this.order();
    if (!o) return;
    this.ordersApi.close(o.id).subscribe({
      next: closed => {
        this.order.set(closed);
        this.notify.success('Order closed. Stock deducted, table freed.');
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  voidOrder(): void {
    const o = this.order();
    if (!o) return;
    if (!confirm('Void this order? Cannot be undone.')) return;
    this.ordersApi.voidOrder(o.id).subscribe({
      next: voided => { this.order.set(voided); this.notify.info('Order voided.'); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  printReceipt(orderId: string): void {
    // Open in a new window — receipt component auto-fires window.print() once it loads.
    // Fallback to same-tab navigation if popups are blocked.
    const w = window.open(`/receipt/${orderId}`, '_blank', 'width=420,height=720');
    if (!w) window.location.href = `/receipt/${orderId}`;
  }

  applyDiscount(): void {
    const o = this.order();
    if (!o) return;
    const current = o.discountAmount;
    const max = (o.subtotalAmount + o.taxAmount).toFixed(2);
    const input = prompt(`Discount amount (max ${max} ${o.currency}):`, current > 0 ? String(current) : '0');
    if (input === null) return;
    const amount = Number(input);
    if (isNaN(amount) || amount < 0) { this.notify.error('Invalid amount.'); return; }
    this.ordersApi.setDiscount(o.id, amount).subscribe({
      next: updated => {
        this.order.set(updated);
        this.payAmount = updated.balance;
        this.notify.success(amount > 0 ? `Discount applied: ${amount.toFixed(2)} ${updated.currency}` : 'Discount cleared.');
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  clearDiscount(): void {
    const o = this.order();
    if (!o) return;
    this.ordersApi.setDiscount(o.id, 0).subscribe({
      next: updated => { this.order.set(updated); this.payAmount = updated.balance; },
      error: err => this.notify.error(userMessage(err))
    });
  }

  /// Pre-fill the payment input with grandTotal/N for split-equally; cashier still
  /// hits "+ Pay" once per guest, picking each method individually.
  splitEqually(n: number): void {
    const o = this.order();
    if (!o || n <= 0) return;
    const remaining = o.balance;
    if (remaining <= 0.001) return;
    this.payAmount = Math.round((remaining / n) * 100) / 100;
    this.notify.info(`Split ${n} ways — pay ${this.payAmount} ${o.currency} per guest.`);
  }
}
