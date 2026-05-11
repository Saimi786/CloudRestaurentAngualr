import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { ProductsApi } from '../../core/api/products.api';
import { StockApi } from '../../core/api/stock.api';
import { UnitsApi } from '../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, ProductDto, UnitDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Stock Transfer</h1>
        <p class="muted">Move stock between branches. Records TransferOut at source and TransferIn at destination atomically.</p>
      </div>
      <a class="btn" routerLink="/inventory/movements">← Movements</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('fromBranchId')">
          <label>From Branch *</label>
          <select formControlName="fromBranchId">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('toBranchId')">
          <label>To Branch *</label>
          <select formControlName="toBranchId">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('productId')" style="flex: 2;">
          <label>Product *</label>
          <select formControlName="productId">
            <option value="">— select —</option>
            @for (p of products(); track p.id) {
              <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
            }
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('unitId')">
          <label>Unit *</label>
          <select formControlName="unitId">
            <option value="">— select —</option>
            @for (u of units(); track u.id) {
              <option [value]="u.id">{{ u.code }}</option>
            }
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('quantity')">
          <label>Quantity *</label>
          <input type="number" min="0.0001" step="0.0001" formControlName="quantity" />
        </div>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Reference</label>
          <input formControlName="reference" placeholder="Auto-generated if blank" />
        </div>
        <div class="field" style="flex: 2;">
          <label>Notes</label>
          <input formControlName="notes" />
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/inventory/movements">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Transferring…' : 'Transfer Stock' }}
        </button>
      </div>
    </form>
  `
})
export class StockTransferComponent {
  private readonly fb = inject(FormBuilder);
  private readonly stock = inject(StockApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fromBranchId: ['', Validators.required],
    toBranchId: ['', Validators.required],
    productId: ['', Validators.required],
    unitId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    reference: [''],
    notes: ['']
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.productsApi.list({}).subscribe(list => this.products.set(list));
    this.unitsApi.list().subscribe(list => this.units.set(list));
  }

  invalid(f: string): boolean {
    const c = this.form.get(f);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    if (raw.fromBranchId === raw.toBranchId) {
      this.notify.error('From and To branches must differ.'); return;
    }
    this.saving.set(true);
    this.stock.transfer({
      fromBranchId: raw.fromBranchId,
      toBranchId: raw.toBranchId,
      productId: raw.productId,
      unitId: raw.unitId,
      quantity: Number(raw.quantity),
      reference: raw.reference || null,
      notes: raw.notes || null,
      occurredAt: null
    }).subscribe({
      next: r => {
        this.notify.success(`Transferred ${r.quantityInProductUnit} ${r.productUnitCode}.`);
        this.router.navigate(['/inventory/movements']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
