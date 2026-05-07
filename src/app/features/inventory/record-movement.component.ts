import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { ProductsApi } from '../../core/api/products.api';
import { StockApi } from '../../core/api/stock.api';
import { UnitsApi } from '../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, ProductDto, StockMovementType, UnitDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-record-movement',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Record Stock Movement</h1>
        <p class="muted">
          Pick a branch + a stock-tracked product, choose any unit in the product's group, and the system normalizes
          to the product's primary unit before updating the balance.
        </p>
      </div>
      <a class="btn" routerLink="/inventory/balances">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('branchId')">
          <label>Branch</label>
          <select formControlName="branchId">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
          @if (invalid('branchId')) { <div class="field-error">{{ errorOf('branchId') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('productId')">
          <label>Product (stock-tracked only)</label>
          <select formControlName="productId" (change)="onProductChange()">
            <option value="">— select —</option>
            @for (p of trackedProducts(); track p.id) {
              <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
            }
          </select>
          @if (invalid('productId')) { <div class="field-error">{{ errorOf('productId') }}</div> }
          @if (trackedProducts().length === 0 && !loadingProducts()) {
            <small class="muted" style="margin-top:0.4rem;">
              No stock-tracked products. Edit a Product and enable "Stock Tracked".
            </small>
          }
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('type')">
          <label>Type</label>
          <select formControlName="type">
            <option [value]="0">Purchase (stock in)</option>
            <option [value]="1">Adjustment (manual correction, can be ±)</option>
            <option [value]="2">Wastage (stock out)</option>
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('quantity')">
          <label>
            Quantity
            @if (selectedProductUnitCode(); as code) {
              <span class="muted" style="font-weight:400;">(in any unit from {{ groupLabel() }} group)</span>
            }
          </label>
          <input type="number" step="any" formControlName="quantity" />
          <small class="muted">For Adjustment, use a negative value to decrease stock.</small>
          @if (invalid('quantity')) { <div class="field-error">{{ errorOf('quantity') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('unitId')">
          <label>Unit</label>
          <select formControlName="unitId">
            <option value="">— select —</option>
            @for (u of compatibleUnits(); track u.id) {
              <option [value]="u.id">{{ u.code }} — {{ u.name }}</option>
            }
          </select>
          @if (selectedProduct() && compatibleUnits().length === 0) {
            <small class="muted">No other units in this product's group.</small>
          }
          @if (invalid('unitId')) { <div class="field-error">{{ errorOf('unitId') }}</div> }
        </div>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Reference (optional)</label>
          <input formControlName="reference" placeholder="PO-001, INV-1234, …" />
        </div>
      </div>

      <div class="field">
        <label>Notes (optional)</label>
        <textarea formControlName="notes" rows="2"></textarea>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/inventory/balances">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Record movement' }}
        </button>
      </div>
    </form>
  `
})
export class RecordMovementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StockApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly trackedProducts = signal<ProductDto[]>([]);
  protected readonly allUnits = signal<UnitDto[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    productId: ['', [Validators.required]],
    unitId: ['', [Validators.required]],
    type: [StockMovementType.Purchase, [Validators.required]],
    quantity: [0, [Validators.required]],
    reference: [''],
    notes: ['']
  });

  protected readonly selectedProduct = computed(() => {
    const id = this.form.controls.productId.value;
    return this.trackedProducts().find(p => p.id === id) ?? null;
  });

  protected readonly selectedProductUnit = computed(() => {
    const p = this.selectedProduct();
    if (!p) return null;
    return this.allUnits().find(u => u.id === p.unitId) ?? null;
  });

  protected readonly selectedProductUnitCode = computed(() => this.selectedProductUnit()?.code ?? null);
  protected readonly groupLabel = computed(() => this.selectedProductUnit()?.groupName ?? '');

  protected readonly compatibleUnits = computed(() => {
    const u = this.selectedProductUnit();
    if (!u) return [];
    return this.allUnits().filter(x => x.groupId === u.groupId && x.isActive);
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.unitsApi.list({ includeInactive: true }).subscribe(list => this.allUnits.set(list));
    this.productsApi.list({}).subscribe({
      next: list => {
        this.trackedProducts.set(list.filter(p => p.isStockTracked));
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false)
    });
  }

  onProductChange(): void {
    // Pre-select product's primary unit if it's compatible.
    const p = this.selectedProduct();
    if (p) this.form.controls.unitId.setValue(p.unitId);
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(field: string): string {
    const c = this.form.get(field);
    if (!c?.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    if (!raw.quantity || Number(raw.quantity) === 0) {
      this.form.controls.quantity.setErrors({ server: 'Quantity cannot be zero.' });
      this.form.controls.quantity.markAsTouched();
      return;
    }

    this.saving.set(true);
    this.api.recordMovement({
      branchId: raw.branchId,
      productId: raw.productId,
      unitId: raw.unitId,
      type: Number(raw.type) as StockMovementType,
      quantity: Number(raw.quantity),
      reference: raw.reference?.trim() || null,
      notes: raw.notes?.trim() || null,
      occurredAt: null
    }).subscribe({
      next: () => {
        this.notify.success('Movement recorded.');
        this.router.navigate(['/inventory/balances']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
