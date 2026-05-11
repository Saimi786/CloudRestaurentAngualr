import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { CustomersApi } from '../../core/api/customers.api';
import { ProductsApi } from '../../core/api/products.api';
import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';
import { UnitsApi } from '../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import {
  BranchDto, ContactType, CustomerDto, ProductDto,
  PurchaseOrderDto, PurchaseOrderLineInput, PurchaseOrderStatus,
  ReceiveLineInput, UnitDto
} from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

interface DraftLine {
  productId: string;
  unitId: string;
  orderedQuantity: number;
  unitCost: number;
  notes: string;
}

@Component({
  selector: 'app-purchase-order-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'PO ' + po()?.number : 'New Purchase Order' }}</h1>
        @if (po(); as p) {
          <p class="muted">
            <span class="badge" [class.badge-active]="p.status === PurchaseOrderStatus.Sent || p.status === PurchaseOrderStatus.PartialReceived">{{ p.statusName }}</span>
            · {{ p.supplierName }} · {{ p.branchName }}
          </p>
        }
      </div>
      <a class="btn" routerLink="/purchase-orders">← Back</a>
    </div>

    @if (!isEdit()) {
      <form class="form panel" [formGroup]="form" (ngSubmit)="create()">
        <div class="form-row">
          <div class="field">
            <label>Branch *</label>
            <select formControlName="branchId">
              <option value="">— select —</option>
              @for (b of branches(); track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Supplier *</label>
            <select formControlName="supplierId">
              <option value="">— select —</option>
              @for (s of suppliers(); track s.id) {
                <option [value]="s.id">{{ s.supplierBusinessName || s.fullName }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Expected date</label>
            <input type="date" formControlName="expectedDate" />
          </div>
          <div class="field">
            <label>Currency</label>
            <input formControlName="currency" maxlength="3" style="text-transform:uppercase;" />
          </div>
        </div>

        <h3 style="margin-top:1.25rem;">Lines</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 38%;">Product</th>
              <th style="width: 12%;">Unit</th>
              <th style="width: 12%; text-align:right;">Qty</th>
              <th style="width: 14%; text-align:right;">Unit cost</th>
              <th style="width: 14%; text-align:right;">Line total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (l of lines(); track $index; let i = $index) {
              <tr>
                <td>
                  <select [(ngModel)]="l.productId" [ngModelOptions]="{standalone:true}">
                    <option value="">—</option>
                    @for (p of products(); track p.id) {
                      <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
                    }
                  </select>
                </td>
                <td>
                  <select [(ngModel)]="l.unitId" [ngModelOptions]="{standalone:true}">
                    <option value="">—</option>
                    @for (u of units(); track u.id) {
                      <option [value]="u.id">{{ u.code }}</option>
                    }
                  </select>
                </td>
                <td>
                  <input type="number" min="0.0001" step="0.0001"
                         [(ngModel)]="l.orderedQuantity" [ngModelOptions]="{standalone:true}" style="text-align:right;" />
                </td>
                <td>
                  <input type="number" min="0" step="0.01"
                         [(ngModel)]="l.unitCost" [ngModelOptions]="{standalone:true}" style="text-align:right;" />
                </td>
                <td style="text-align:right;" class="mono">
                  {{ (l.orderedQuantity * l.unitCost).toFixed(2) }}
                </td>
                <td>
                  <button type="button" class="btn btn-sm btn-danger" (click)="removeLine(i)">×</button>
                </td>
              </tr>
            }
            <tr>
              <td colspan="6" style="text-align:right;">
                <strong>Total: {{ totalAmount() | number:'1.2-2' }}</strong>
                <button type="button" class="btn btn-sm" style="margin-left:1rem;" (click)="addLine()">+ Add line</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="form-row">
          <div class="field" style="flex:3;">
            <label>Notes</label>
            <input formControlName="notes" />
          </div>
        </div>

        <div class="form-actions">
          <a class="btn" routerLink="/purchase-orders">Cancel</a>
          <button type="submit" class="btn btn-primary" [disabled]="saving() || lines().length === 0">
            {{ saving() ? 'Creating…' : 'Create Draft' }}
          </button>
        </div>
      </form>
    }

    <!-- View / receive existing PO ----------------------------------- -->
    @if (po(); as p) {
      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Unit</th>
              <th style="text-align:right;">Ordered</th>
              <th style="text-align:right;">Received</th>
              <th style="text-align:right;">Unit cost</th>
              <th style="text-align:right;">Line total</th>
              @if (canReceive(p)) { <th style="text-align:right;">Receive now</th> }
            </tr>
          </thead>
          <tbody>
            @for (l of p.lines; track l.id) {
              <tr>
                <td class="mono">{{ l.productSku }}</td>
                <td>{{ l.productName }}</td>
                <td>{{ l.unitCode }}</td>
                <td style="text-align:right;" class="mono">{{ l.orderedQuantity }}</td>
                <td style="text-align:right;" class="mono">{{ l.receivedQuantity }}</td>
                <td style="text-align:right;" class="mono">{{ l.unitCost | number:'1.2-2' }}</td>
                <td style="text-align:right;" class="mono">{{ l.lineTotal | number:'1.2-2' }}</td>
                @if (canReceive(p)) {
                  <td style="text-align:right;">
                    <input type="number" min="0" [max]="l.orderedQuantity - l.receivedQuantity" step="0.0001"
                           [(ngModel)]="receiveQty[l.id]" style="width:90px;text-align:right;" />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:1rem;">
          <div>
            @if (canReceive(p)) {
              <div class="form-row">
                <div class="field">
                  <label>Supplier invoice #</label>
                  <input [(ngModel)]="receiveBillRef" />
                </div>
                <div class="field">
                  <label>Bill date</label>
                  <input type="date" [(ngModel)]="receiveBillDate" />
                </div>
                <div class="field">
                  <label>Due date</label>
                  <input type="date" [(ngModel)]="receiveDueDate" />
                </div>
              </div>
            }
          </div>
          <div style="text-align:right;">
            <div>Subtotal <strong class="mono">{{ p.subtotalAmount | number:'1.2-2' }}</strong></div>
            <div>Total <strong class="mono">{{ p.grandTotalAmount | number:'1.2-2' }} {{ p.currency }}</strong></div>
          </div>
        </div>

        <div class="form-actions" style="margin-top:1rem;">
          @if (p.status === PurchaseOrderStatus.Draft) {
            <button class="btn btn-primary" (click)="send(p)">Send to supplier</button>
            <button class="btn btn-danger" (click)="cancel(p)">Cancel</button>
          }
          @if (canReceive(p)) {
            <button class="btn btn-primary" (click)="receive(p)" [disabled]="receiving()">
              {{ receiving() ? 'Receiving…' : 'Receive entered qtys' }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class PurchaseOrderEditComponent {
  private readonly api = inject(PurchaseOrdersApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly customersApi = inject(CustomersApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly PurchaseOrderStatus = PurchaseOrderStatus;
  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly po = signal<PurchaseOrderDto | null>(null);
  protected readonly saving = signal(false);
  protected readonly receiving = signal(false);

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly suppliers = signal<CustomerDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);

  protected readonly lines = signal<DraftLine[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', Validators.required],
    supplierId: ['', Validators.required],
    expectedDate: [''],
    currency: ['PKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    notes: ['']
  });

  protected readonly totalAmount = computed(() =>
    this.lines().reduce((s, l) => s + (l.orderedQuantity || 0) * (l.unitCost || 0), 0));

  protected receiveQty: Record<string, number> = {};
  protected receiveBillRef = '';
  protected receiveBillDate = '';
  protected receiveDueDate = '';

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.productsApi.list({}).subscribe(list => this.products.set(list));
    this.unitsApi.list().subscribe(list => this.units.set(list));

    // Pull both Supplier and Both contact types
    this.customersApi.list({ type: ContactType.Supplier }).subscribe(a => {
      this.customersApi.list({ type: ContactType.Both }).subscribe(b => {
        const byId = new Map<string, CustomerDto>();
        a.concat(b).forEach(c => byId.set(c.id, c));
        this.suppliers.set([...byId.values()]);
      });
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.loadPo(routeId);
    } else {
      this.addLine();
    }
  }

  loadPo(id: string): void {
    this.api.get(id).subscribe({
      next: p => { this.po.set(p); this.receiveQty = {}; },
      error: err => this.notify.error(userMessage(err))
    });
  }

  addLine(): void {
    this.lines.update(list => [...list, {
      productId: '', unitId: '', orderedQuantity: 1, unitCost: 0, notes: ''
    }]);
  }

  removeLine(i: number): void {
    this.lines.update(list => list.filter((_, ix) => ix !== i));
  }

  canReceive(p: PurchaseOrderDto): boolean {
    return p.status === PurchaseOrderStatus.Sent || p.status === PurchaseOrderStatus.PartialReceived;
  }

  create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const validLines = this.lines().filter(l => l.productId && l.unitId && l.orderedQuantity > 0);
    if (validLines.length === 0) { this.notify.error('Add at least one line.'); return; }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.api.create({
      branchId: raw.branchId,
      supplierId: raw.supplierId,
      expectedDate: raw.expectedDate || null,
      currency: raw.currency.toUpperCase(),
      notes: raw.notes || null,
      lines: validLines.map(l => ({
        productId: l.productId, unitId: l.unitId,
        orderedQuantity: Number(l.orderedQuantity),
        unitCost: Number(l.unitCost),
        notes: l.notes || null
      } as PurchaseOrderLineInput))
    }).subscribe({
      next: p => {
        this.notify.success(`Created ${p.number}.`);
        this.router.navigate(['/purchase-orders', p.id]);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  send(p: PurchaseOrderDto): void {
    if (!confirm(`Send ${p.number} to ${p.supplierName}?`)) return;
    this.api.send(p.id).subscribe({
      next: () => { this.notify.success('Sent.'); this.loadPo(p.id); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  cancel(p: PurchaseOrderDto): void {
    if (!confirm(`Cancel ${p.number}?`)) return;
    this.api.cancel(p.id).subscribe({
      next: () => { this.notify.success('Cancelled.'); this.loadPo(p.id); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  receive(p: PurchaseOrderDto): void {
    const lines: ReceiveLineInput[] = Object.entries(this.receiveQty)
      .filter(([, q]) => q > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity: Number(quantity) }));
    if (lines.length === 0) { this.notify.error('Enter quantities to receive.'); return; }

    this.receiving.set(true);
    this.api.receive(p.id, {
      supplierBillReference: this.receiveBillRef.trim() || null,
      billDate: this.receiveBillDate || null,
      dueDate: this.receiveDueDate || null,
      lines
    }).subscribe({
      next: updated => {
        this.receiving.set(false);
        this.po.set(updated);
        this.receiveQty = {};
        this.notify.success(`Received. Status: ${updated.statusName}.`);
      },
      error: err => {
        this.receiving.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }
}
