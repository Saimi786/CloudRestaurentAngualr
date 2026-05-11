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
import { AuthService } from '../../core/auth/auth.service';
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
          <select class="branch-select" [(ngModel)]="branchId" (ngModelChange)="onBranchChange()">
            @for (b of branches(); track b.id) {
              <option [value]="b.id">📍 {{ b.name }}</option>
            }
          </select>
          <input class="search" type="search" placeholder="🔍 Search SKU, name, or scan barcode…"
                 [(ngModel)]="search" />
        </div>

        <div class="category-chips">
          <button type="button"
                  class="chip"
                  [class.active]="!categoryFilter"
                  (click)="categoryFilter = ''">
            All
          </button>
          @for (c of categories(); track c.id) {
            <button type="button"
                    class="chip"
                    [class.active]="categoryFilter === c.id"
                    (click)="categoryFilter = c.id">
              {{ c.name }}
            </button>
          }
        </div>

        <div class="product-grid">
          @for (p of filteredProducts(); track p.id) {
            <button class="product-tile" type="button" (click)="onProductClick(p)" [disabled]="!order()">
              <div class="tile-thumb" [style.background]="tileGradient(p.id)">
                {{ tileInitial(p.name) }}
              </div>
              <div class="tile-body">
                <div class="product-name">{{ p.name }}</div>
                <div class="product-sku mono">{{ p.sku }}</div>
              </div>
              <div class="product-price">{{ p.basePriceAmount | number:'1.2-2' }} <span class="ccy">{{ p.basePriceCurrency }}</span></div>
            </button>
          }
          @if (filteredProducts().length === 0 && !loadingProducts()) {
            <div class="empty-grid">
              <div class="empty-icon">🍽️</div>
              <p>No products match the current filter.</p>
            </div>
          }
        </div>
      </div>

      <!-- RIGHT: order panel -->
      <div class="pos-right">
        @let o = order();
        @if (!o) {
          <div class="open-form panel">
            <h2>🛒 New Order</h2>
            <p class="muted small" style="margin: 0 0 1rem;">Pick the order type and (optionally) attach a customer.</p>

            <div class="field">
              <label>Order type</label>
              <div class="type-picker">
                <button type="button" class="type-card" [class.selected]="Number(newType) === 0" (click)="newType = 0">
                  <span class="ico">🍽️</span>
                  <span class="title">Dine-in</span>
                  <span class="muted small">Table service</span>
                </button>
                <button type="button" class="type-card" [class.selected]="Number(newType) === 1" (click)="newType = 1">
                  <span class="ico">🥡</span>
                  <span class="title">Takeaway</span>
                  <span class="muted small">Pickup</span>
                </button>
                <button type="button" class="type-card" [class.selected]="Number(newType) === 2" (click)="newType = 2">
                  <span class="ico">🛵</span>
                  <span class="title">Delivery</span>
                  <span class="muted small">Out for delivery</span>
                </button>
              </div>
            </div>

            @if (Number(newType) === 0) {
              <div class="field">
                <label>Table</label>
                <select [(ngModel)]="newTableId">
                  <option value="">— Pick a table —</option>
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
                <div class="customer-found">
                  <div class="customer-avatar">{{ tileInitial(c.fullName) }}</div>
                  <div>
                    <strong>{{ c.fullName }}</strong>
                    <div class="muted small">★ {{ c.totalRewardPoints }} reward points</div>
                  </div>
                </div>
              }
            </div>

            <button type="button" class="btn btn-primary btn-lg" (click)="openOrder()" [disabled]="opening()" style="margin-top:0.5rem;">
              {{ opening() ? 'Opening…' : '→ Open Order' }}
            </button>
          </div>
        } @else {
          <div class="order-panel">
            <div class="order-header">
              <div class="order-head-main">
                <div class="order-type-badge" [class.dine-in]="o.type === 0" [class.takeaway]="o.type === 1" [class.delivery]="o.type === 2">
                  {{ o.type === 0 ? '🍽️' : o.type === 1 ? '🥡' : '🛵' }}
                  {{ o.typeName }}
                </div>
                @if (o.orderNumber) {
                  <span class="order-num mono">{{ o.orderNumber }}</span>
                }
              </div>
              <div class="order-head-meta">
                @if (o.tableCode) {
                  <span class="meta-chip">Table {{ o.tableCode }}</span>
                }
                @if (o.customerName) {
                  <span class="meta-chip customer">👤 {{ o.customerName }}</span>
                } @else {
                  <span class="meta-chip walk-in">Walk-in</span>
                }
              </div>
              @if (o.status === 0) {
                <button class="btn btn-sm btn-ghost" type="button" (click)="resetOrder()" title="Start a new order">+ New</button>
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
                        <div class="muted small mono">{{ '@' }}{{ line.unitPriceAmount | number:'1.2-2' }}</div>
                        @if (o.status === 0) {
                          @if (canEditPrice()) {
                            <button class="btn btn-sm" type="button" title="Override unit price"
                                    (click)="overrideLinePrice(line.id, line.unitPriceAmount)">$</button>
                          }
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
              @if (o.rewardPointsRedeemed > 0) {
                <div class="row"><span>Points ({{ o.rewardPointsRedeemed }})</span><span class="mono">−{{ o.rewardPointsRedeemedAmount | number:'1.2-2' }} {{ o.currency }}</span></div>
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
                <button class="btn btn-sm" type="button" (click)="redeemPoints()" [disabled]="o.lines.length === 0 || !o.customerId">
                  {{ o.rewardPointsRedeemed > 0 ? '★ ' + o.rewardPointsRedeemed + ' pts' : '★ Redeem points' }}
                </button>
                @if (o.rewardPointsRedeemed > 0) {
                  <button class="btn btn-sm" type="button" (click)="clearRedemption()">Clear ★</button>
                }
                <span class="split-helper muted small">Split:</span>
                <button class="btn btn-sm" type="button" (click)="splitEqually(2)" [disabled]="o.balance <= 0.001">2 ways</button>
                <button class="btn btn-sm" type="button" (click)="splitEqually(3)" [disabled]="o.balance <= 0.001">3 ways</button>
                <button class="btn btn-sm" type="button" (click)="splitEqually(4)" [disabled]="o.balance <= 0.001">4 ways</button>
              </div>

              <!-- Quick cash buttons — biggest UX win for cash drawers. -->
              @if (Number(payMethod) === 0 && o.balance > 0.001) {
                <div class="quick-cash">
                  @for (q of quickCashAmounts(o.balance); track q.label) {
                    <button class="cash-key" type="button" (click)="payAmount = q.value">
                      {{ q.label }}
                    </button>
                  }
                  <button class="cash-key cash-key-exact" type="button" (click)="payAmount = roundUp2(o.balance)">
                    Exact
                  </button>
                </div>
              }

              <div class="payments-form">
                <div class="method-tabs">
                  @for (m of paymentMethods; track m.value) {
                    <button class="method-tab" type="button"
                            [class.active]="Number(payMethod) === m.value"
                            (click)="payMethod = m.value">
                      <span class="method-ico">{{ m.icon }}</span>
                      <span>{{ m.label }}</span>
                    </button>
                  }
                </div>
                <div class="pay-input-row">
                  <input type="number" step="0.01" min="0"
                         [(ngModel)]="payAmount"
                         placeholder="0.00"
                         class="pay-input mono" />
                  <button class="btn btn-primary btn-pay" type="button"
                          (click)="recordPayment()"
                          [disabled]="!payAmount || payAmount <= 0">
                    + Add Payment
                  </button>
                </div>
              </div>

              <div class="actions">
                <button class="btn" type="button" (click)="printReceipt(o.id)" [disabled]="o.lines.length === 0">🖨 Print</button>
                <button class="btn btn-danger" type="button" (click)="voidOrder()">Void</button>
                <button class="btn btn-primary btn-close-order" type="button" [disabled]="o.balance > 0.001 || o.lines.length === 0" (click)="closeOrder()">
                  ✓ Close Order
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
    .pos {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 1rem;
      height: calc(100vh - 100px);
    }

    /* ---------- LEFT: catalog ---------- */
    .pos-left { display: flex; flex-direction: column; gap: 0.65rem; min-height: 0; }

    .pos-toolbar {
      display: flex;
      gap: 0.5rem;
    }
    .pos-toolbar select,
    .pos-toolbar .search {
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--c-border-strong);
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      background: var(--c-surface);
      color: var(--c-text);
      font-family: inherit;
      transition: border-color var(--t-fast), box-shadow var(--t-fast);
      &:focus { outline: none; border-color: var(--c-primary); box-shadow: var(--shadow-focus); }
    }
    .branch-select { font-weight: 600; min-width: 200px; }
    .search { flex: 1; }

    .category-chips {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding: 0.25rem 0;
      scrollbar-width: thin;
    }
    .chip {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      color: var(--c-text-muted);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-pill);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--t-fast);
      &:hover { background: var(--c-surface-hover); color: var(--c-text); border-color: var(--c-border-strong); }
      &.active {
        background: var(--c-primary);
        color: #fff;
        border-color: var(--c-primary);
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);
      }
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 0.65rem;
      overflow-y: auto;
      padding-right: 0.25rem;
      align-content: start;
    }
    .product-tile {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      padding: 0;
      text-align: left;
      cursor: pointer;
      transition: all var(--t-fast);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-xs);
      font-family: inherit;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--c-primary-soft-strong);
      }
      &:active:not(:disabled) { transform: translateY(-1px); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }
    .tile-thumb {
      height: 60px;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 1.6rem;
      letter-spacing: -0.02em;
    }
    .tile-body {
      padding: 0.55rem 0.7rem 0.25rem;
      min-height: 50px;
    }
    .product-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--c-text);
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-sku { font-size: 0.68rem; color: var(--c-text-subtle); margin-top: 2px; }
    .product-price {
      font-family: var(--font-mono);
      color: var(--c-primary-active);
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.35rem 0.7rem 0.55rem;
      background: linear-gradient(180deg, transparent, var(--c-primary-soft));
      .ccy { font-size: 0.7rem; opacity: 0.7; }
    }

    .empty-grid {
      grid-column: 1 / -1;
      text-align: center;
      padding: 2.5rem 1rem;
      color: var(--c-text-subtle);
    }
    .empty-icon { font-size: 2.5rem; opacity: 0.55; margin-bottom: 0.4rem; }

    /* ---------- RIGHT: order panel ---------- */
    .pos-right { display: flex; flex-direction: column; min-height: 0; }

    .open-form {
      padding: 1.5rem;
      h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
      .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
      label { font-size: 0.74rem; font-weight: 600; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      select, input {
        padding: 0.6rem 0.85rem;
        border: 1px solid var(--c-border-strong);
        border-radius: var(--radius-md);
        font-size: 0.92rem;
        font-family: inherit;
        &:focus { outline: none; border-color: var(--c-primary); box-shadow: var(--shadow-focus); }
      }
    }
    .type-picker {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .type-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0.85rem 0.5rem 0.65rem;
      background: var(--c-surface);
      border: 2px solid var(--c-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-family: inherit;
      transition: all var(--t-fast);
      .ico { font-size: 1.5rem; }
      .title { font-weight: 600; font-size: 0.88rem; color: var(--c-text); }
      .small { font-size: 0.7rem; }
      &:hover { border-color: var(--c-border-strong); transform: translateY(-1px); }
      &.selected {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
        .title { color: var(--c-primary-active); }
      }
    }
    .customer-found {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.75rem;
      background: var(--c-primary-soft);
      border: 1px dashed var(--c-primary-soft-strong);
      border-radius: var(--radius-md);
      margin-top: 0.35rem;
    }
    .customer-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .order-panel {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .order-header {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--c-divider);
      background: linear-gradient(135deg, var(--c-primary-soft) 0%, var(--c-surface) 100%);
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.4rem;
      align-items: center;
      flex-shrink: 0;
    }
    .order-head-main {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .order-head-meta {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .order-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.7rem;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.88rem;
      letter-spacing: -0.01em;
      background: #fff;
      color: var(--c-text);
      border: 1px solid var(--c-border);
      &.dine-in   { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
      &.takeaway  { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      &.delivery  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    }
    .order-num {
      font-size: 0.82rem;
      color: var(--c-text-muted);
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      background: var(--c-surface);
      border-radius: var(--radius-sm);
      border: 1px dashed var(--c-border-strong);
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-pill);
      font-size: 0.74rem;
      font-weight: 500;
      background: var(--c-surface);
      color: var(--c-text);
      border: 1px solid var(--c-border);
      &.customer { background: var(--c-primary-soft); color: var(--c-primary-active); border-color: transparent; }
      &.walk-in  { color: var(--c-text-muted); font-style: italic; }
    }

    .order-lines {
      flex: 1;
      overflow-y: auto;
      padding: 0.4rem 0;
      min-height: 60px;
    }
    .order-line {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--c-divider);
      transition: background var(--t-fast);
      &:hover { background: var(--c-surface-alt); }
    }
    .line-main { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; }
    .line-mods { font-size: 0.78rem; color: var(--c-text-muted); }
    .mono { font-family: var(--font-mono); }
    .empty {
      padding: 1.5rem 1rem;
      text-align: center;
      color: var(--c-text-subtle);
      font-size: 0.88rem;
    }

    .order-totals {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--c-divider);
      background: var(--c-surface-alt);
      flex-shrink: 0;
    }
    .order-totals .row {
      display: flex;
      justify-content: space-between;
      padding: 0.18rem 0;
      font-size: 0.88rem;
      color: var(--c-text-muted);
    }
    .order-totals .row .mono { color: var(--c-text); }
    .order-totals .total {
      font-weight: 700;
      border-top: 1px dashed var(--c-border-strong);
      padding-top: 0.45rem;
      margin-top: 0.35rem;
      color: var(--c-text-strong);
      font-size: 0.95rem;
      .mono { color: var(--c-primary-active); font-size: 1.05rem; }
    }

    .discount-bar {
      display: flex;
      gap: 0.4rem;
      padding: 0.65rem 1rem;
      border-top: 1px solid var(--c-divider);
      flex-wrap: wrap;
      align-items: center;
      flex-shrink: 0;
    }
    .split-helper { font-size: 0.75rem; margin-left: auto; }

    .quick-cash {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.35rem;
      padding: 0.65rem 1rem 0;
      flex-shrink: 0;
    }
    .cash-key {
      padding: 0.55rem 0.3rem;
      background: var(--c-surface);
      border: 1px solid var(--c-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--c-text);
      cursor: pointer;
      transition: all var(--t-fast);
      &:hover {
        background: var(--c-primary-soft);
        border-color: var(--c-primary);
        color: var(--c-primary-active);
        transform: translateY(-1px);
      }
      &:active { transform: translateY(0); }
    }
    .cash-key-exact {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
      border-color: transparent;
      font-family: inherit;
      &:hover { filter: brightness(1.05); background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border-color: transparent; }
    }

    .payments-form {
      padding: 0.65rem 1rem;
      border-top: 1px solid var(--c-divider);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      flex-shrink: 0;
    }
    .method-tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.3rem;
    }
    .method-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0.45rem 0.25rem;
      border: 1px solid var(--c-border);
      background: var(--c-surface);
      border-radius: var(--radius-md);
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--t-fast);
      color: var(--c-text-muted);
      .method-ico { font-size: 1.1rem; }
      &:hover { border-color: var(--c-border-strong); color: var(--c-text); }
      &.active {
        background: var(--c-primary);
        color: #fff;
        border-color: var(--c-primary);
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
      }
    }
    .pay-input-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.4rem;
    }
    .pay-input {
      padding: 0.6rem 0.85rem;
      border: 1px solid var(--c-border-strong);
      border-radius: var(--radius-md);
      font-size: 1.05rem;
      font-weight: 600;
      text-align: right;
      letter-spacing: -0.01em;
      font-family: var(--font-mono);
      &:focus { outline: none; border-color: var(--c-primary); box-shadow: var(--shadow-focus); }
    }
    .btn-pay { padding: 0 1rem; }

    .actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.65rem 1rem 0.85rem;
      border-top: 1px solid var(--c-divider);
      flex-shrink: 0;
    }
    .actions .btn-close-order { flex: 1; font-weight: 600; }

    .closed-banner {
      padding: 1.1rem;
      background: var(--c-success-soft);
      color: var(--c-success-fg);
      text-align: center;
      font-weight: 600;
      border-top: 1px solid var(--c-divider);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }

    /* ---------- Modifier picker ---------- */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      display: grid; place-items: center;
      z-index: 100;
      animation: fade-in 0.15s ease-out;
    }
    .modal {
      background: var(--c-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      min-width: 380px; max-width: 520px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: var(--shadow-xl);
      animation: pop 0.15s ease-out;
    }
    .modal h2 { margin: 0 0 0.85rem; font-size: 1.15rem; }
    .mod-group { margin: 0.9rem 0; }
    .mod-group-header { font-weight: 600; margin-bottom: 0.45rem; color: var(--c-text); }
    .mod-option {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--c-border);
      border-radius: var(--radius-md);
      margin-bottom: 0.3rem;
      cursor: pointer;
      transition: all var(--t-fast);
      &:hover { background: var(--c-surface-hover); border-color: var(--c-border-strong); }
      input { accent-color: var(--c-primary); }
      .mono { margin-left: auto; }
    }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop {
      from { transform: scale(0.96); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    .small { font-size: 0.78rem; }
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
  protected readonly auth = inject(AuthService);

  /** Cap on the discount % this cashier can apply, or null = unlimited. */
  protected readonly maxDiscountPercent = computed(() => this.auth.maxDiscountPercent());
  /** True when the user may override line prices at the POS. Tenant/Branch managers always can. */
  protected readonly canEditPrice = computed(() =>
    this.auth.canAccessAllBranches() || this.auth.hasRole('BranchManager'));

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

  protected readonly paymentMethods = [
    { value: 0, label: 'Cash', icon: '💵' },
    { value: 1, label: 'Card', icon: '💳' },
    { value: 2, label: 'Bank', icon: '🏦' },
    { value: 3, label: 'Wallet', icon: '📱' },
  ];

  /** Predictable per-product gradient — same product always gets the same tile color. */
  protected tileGradient(productId: string): string {
    const palette = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#0ea5e9,#0284c7)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'linear-gradient(135deg,#f43f5e,#e11d48)',
      'linear-gradient(135deg,#14b8a6,#0d9488)',
    ];
    let h = 0;
    for (const ch of productId) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
    return palette[Math.abs(h) % palette.length];
  }

  protected tileInitial(name: string): string {
    const trimmed = (name ?? '?').trim();
    return trimmed.length === 0 ? '?' : trimmed.charAt(0).toUpperCase();
  }

  protected roundUp2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * Smart cash-drawer shortcuts: the four "common" denominations (50, 100, 500, 1000)
   * but only those at or above the balance owed, plus a quick "+50" / "+100" rounder.
   * Returns 4 options to keep the row tidy alongside the Exact button.
   */
  protected quickCashAmounts(balance: number): Array<{ label: string; value: number }> {
    const exact = this.roundUp2(balance);
    // Pick the next-bigger common notes; never offer below balance (cashier can use Exact).
    const candidates = [100, 200, 500, 1000, 2000, 5000];
    const above = candidates.filter(c => c >= exact);
    const top4 = above.slice(0, 4);
    // If the balance is huge, fall back to a "round up to next 100" suggestion.
    if (top4.length < 4) {
      const roundUp = Math.ceil(exact / 100) * 100;
      if (roundUp > exact && !top4.includes(roundUp)) top4.push(roundUp);
    }
    return top4.slice(0, 4).map(v => ({ label: v.toString(), value: v }));
  }

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
    const preDiscount = o.subtotalAmount + o.taxAmount;
    const cap = this.maxDiscountPercent();
    const capLabel = cap !== null ? ` — your max is ${cap}%` : '';
    const max = preDiscount.toFixed(2);
    const input = prompt(`Discount amount (max ${max} ${o.currency}${capLabel}):`,
      current > 0 ? String(current) : '0');
    if (input === null) return;
    const amount = Number(input);
    if (isNaN(amount) || amount < 0) { this.notify.error('Invalid amount.'); return; }

    // Client-side guard — server enforces it too, but a friendly check avoids the round-trip.
    if (cap !== null && preDiscount > 0) {
      const pct = (amount / preDiscount) * 100;
      if (pct > cap) {
        this.notify.error(
          `Discount ${pct.toFixed(2)}% exceeds your max ${cap}%. Ask a manager to apply this discount.`);
        return;
      }
    }

    this.ordersApi.setDiscount(o.id, amount).subscribe({
      next: updated => {
        this.order.set(updated);
        this.payAmount = updated.balance;
        this.notify.success(amount > 0 ? `Discount applied: ${amount.toFixed(2)} ${updated.currency}` : 'Discount cleared.');
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  overrideLinePrice(lineId: string, currentPrice: number): void {
    const o = this.order();
    if (!o || !this.canEditPrice()) {
      this.notify.error('You do not have permission to override prices.');
      return;
    }
    const input = prompt('New unit price:', String(currentPrice));
    if (input === null) return;
    const price = Number(input);
    if (isNaN(price) || price < 0) { this.notify.error('Invalid price.'); return; }
    this.ordersApi.overrideLinePrice(o.id, lineId, price).subscribe({
      next: updated => {
        this.order.set(updated);
        this.payAmount = updated.balance;
        this.notify.success('Price overridden.');
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

  redeemPoints(): void {
    const o = this.order();
    if (!o) return;
    if (!o.customerId) {
      this.notify.error('Attach a customer first to redeem points.');
      return;
    }
    // Ask the server what's redeemable so the prompt can show the right max.
    this.ordersApi.redeemPreview(o.id).subscribe({
      next: pv => {
        if (!pv.enabled) { this.notify.error('Reward points are not enabled.'); return; }
        if (!pv.orderEligible) { this.notify.error(pv.ineligibleReason ?? 'Order not eligible.'); return; }

        const promptMsg =
          `${pv.name} balance: ${pv.customerBalance}\n` +
          `Max redeemable: ${pv.maxRedeemable} (worth ${pv.maxRedemptionAmount.toFixed(2)} ${o.currency})\n` +
          (pv.minRedeemPoints ? `Minimum to redeem: ${pv.minRedeemPoints}\n` : '') +
          `\nHow many points to redeem?`;
        const input = prompt(promptMsg, o.rewardPointsRedeemed > 0 ? String(o.rewardPointsRedeemed) : String(pv.maxRedeemable));
        if (input === null) return;
        const points = Number(input);
        if (isNaN(points) || points < 0) { this.notify.error('Invalid amount.'); return; }

        this.ordersApi.redeemPoints(o.id, points).subscribe({
          next: updated => {
            this.order.set(updated);
            this.payAmount = updated.balance;
            this.notify.success(points === 0
              ? 'Points redemption cleared.'
              : `${points} ${pv.name} redeemed (${updated.rewardPointsRedeemedAmount.toFixed(2)} ${updated.currency}).`);
          },
          error: err => this.notify.error(userMessage(err))
        });
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  clearRedemption(): void {
    const o = this.order();
    if (!o) return;
    this.ordersApi.redeemPoints(o.id, 0).subscribe({
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
