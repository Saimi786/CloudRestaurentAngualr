import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandsApi } from '../../../core/api/brands.api';
import { CategoriesApi } from '../../../core/api/categories.api';
import { ModifierGroupsApi } from '../../../core/api/modifier-groups.api';
import { ProductsApi } from '../../../core/api/products.api';
import { TaxRatesApi } from '../../../core/api/tax-rates.api';
import { UnitsApi } from '../../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import {
  BrandDto,
  CategoryDto,
  ModifierGroupSummaryDto,
  ProductType,
  TaxRateDto,
  UnitDto
} from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Product' : 'New Product' }}</h1>
        <p>Menu item or SKU — what shows up on the POS, the receipt, and in inventory reports.</p>
      </div>
      <div class="actions">
        <a class="btn" routerLink="/catalog/products">← Back to list</a>
      </div>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">

      <!-- ============ Identification ============ -->
      <section class="form-card">
        <div class="card-head">
          <h2>🏷️ Identification</h2>
          <span class="card-sub">SKU, name, classification, and the tax bucket it falls under.</span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field" [class.invalid]="invalid('sku')">
              <label>SKU</label>
              <input formControlName="sku" placeholder="BUR-001" />
              @if (invalid('sku')) { <div class="field-error">{{ errorOf('sku') }}</div> }
            </div>
            <div class="field span-2" [class.invalid]="invalid('name')">
              <label>Name</label>
              <input formControlName="name" placeholder="e.g. Cheese Burger" />
              @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
            </div>
            <div class="field">
              <label>Type</label>
              <select formControlName="type">
                <option [value]="0">Goods</option>
                <option [value]="1">Service</option>
                <option [value]="2">Combo</option>
                <option [value]="3">Modifier</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="field" [class.invalid]="invalid('categoryId')">
              <label>Category</label>
              <select formControlName="categoryId">
                <option value="">— select —</option>
                @for (c of categories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (invalid('categoryId')) { <div class="field-error">{{ errorOf('categoryId') }}</div> }
            </div>
            <div class="field" [class.invalid]="invalid('unitId')">
              <label>Unit</label>
              <select formControlName="unitId">
                <option value="">— select —</option>
                @for (u of units(); track u.id) {
                  <option [value]="u.id">{{ u.code }} — {{ u.name }}</option>
                }
              </select>
              @if (invalid('unitId')) { <div class="field-error">{{ errorOf('unitId') }}</div> }
            </div>
            <div class="field">
              <label>Brand</label>
              <select formControlName="brandId">
                <option value="">— none —</option>
                @for (b of brands(); track b.id) {
                  <option [value]="b.id">{{ b.name }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label>Tax Rate</label>
              <select formControlName="taxRateId">
                <option value="">— default —</option>
                @for (t of taxRates(); track t.id) {
                  <option [value]="t.id">{{ t.name }} · {{ t.percentage }}%</option>
                }
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Pricing ============ -->
      <section class="form-card">
        <div class="card-head">
          <h2>💲 Pricing</h2>
          <span class="card-sub">Sale price hits the receipt; cost price drives profit reports and isn't shown to customers.</span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field" [class.invalid]="invalid('basePriceAmount')">
              <label>Sale Price</label>
              <input type="number" step="0.01" min="0" formControlName="basePriceAmount" />
              @if (invalid('basePriceAmount')) { <div class="field-error">{{ errorOf('basePriceAmount') }}</div> }
            </div>
            <div class="field" [class.invalid]="invalid('basePriceCurrency')">
              <label>Currency</label>
              <input formControlName="basePriceCurrency" maxlength="3" style="text-transform:uppercase;" placeholder="PKR" />
              @if (invalid('basePriceCurrency')) { <div class="field-error">{{ errorOf('basePriceCurrency') }}</div> }
            </div>
            <div class="field">
              <label>Cost Price (optional)</label>
              <input type="number" step="0.01" min="0" formControlName="costPriceAmount" placeholder="0.00" />
            </div>
            <div class="field">
              <label>Cost Currency</label>
              <input formControlName="costPriceCurrency" maxlength="3" style="text-transform:uppercase;" placeholder="PKR" />
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Inventory & Logistics ============ -->
      <section class="form-card">
        <div class="card-head">
          <h2>📦 Inventory &amp; Logistics</h2>
          <span class="card-sub">Barcode for scanning, HSN/tax code for invoices, reorder threshold for low-stock alerts.</span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field" [class.invalid]="invalid('barcode')">
              <label>Barcode</label>
              <input formControlName="barcode" placeholder="6291041500213" />
            </div>
            <div class="field" [class.invalid]="invalid('hsnCode')">
              <label>HSN / Tax Code</label>
              <input formControlName="hsnCode" placeholder="for GST/VAT invoices" />
            </div>
            <div class="field">
              <label>Reorder Point</label>
              <input type="number" step="0.01" min="0" formControlName="reorderPoint" placeholder="—" />
            </div>
            <div class="field">
              <label>Weight</label>
              <input type="number" step="0.001" min="0" formControlName="weight" placeholder="—" />
            </div>
          </div>

          <div class="form-grid">
            <div class="field span-full" [class.invalid]="invalid('imageUrl')">
              <label>Image URL</label>
              <input formControlName="imageUrl" placeholder="https://…" />
            </div>
          </div>

          <div class="form-grid">
            <div class="field span-full" [class.invalid]="invalid('description')">
              <label>Description</label>
              <textarea formControlName="description" rows="3" placeholder="Short menu description shown on the receipt and POS tile (optional)."></textarea>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Flags ============ -->
      <section class="form-card">
        <div class="card-head">
          <h2>🚩 Flags</h2>
          <span class="card-sub">Behavior switches that change how this item flows through orders, purchases, and stock.</span>
        </div>
        <div class="card-body">
          <div class="flag-grid">
            <label class="toggle-pill" [class.on]="form.controls.isTaxable.value">
              <input type="checkbox" formControlName="isTaxable" />
              <span class="dot"></span>
              Taxable
            </label>
            <label class="toggle-pill" [class.on]="form.controls.isSold.value">
              <input type="checkbox" formControlName="isSold" />
              <span class="dot"></span>
              Sold to customers
            </label>
            <label class="toggle-pill" [class.on]="form.controls.isPurchased.value">
              <input type="checkbox" formControlName="isPurchased" />
              <span class="dot"></span>
              Purchased from suppliers
            </label>
            <label class="toggle-pill" [class.on]="form.controls.isStockTracked.value">
              <input type="checkbox" formControlName="isStockTracked" />
              <span class="dot"></span>
              Stock-tracked
            </label>
          </div>
        </div>
      </section>

      <!-- ============ Sticky action bar ============ -->
      <div class="sticky-actions">
        <a class="btn" routerLink="/catalog/products">Cancel</a>
        <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? '✓ Save Changes' : '+ Create Product') }}
        </button>
      </div>
    </form>

    @if (isEdit()) {
      <section class="form-card" style="max-width:1080px; margin-top:0.5rem;">
        <div class="card-head">
          <h2>✨ Modifier Groups</h2>
          <span class="card-sub">Pick which modifier groups customers can choose from when ordering this item.</span>
        </div>
        <div class="card-body">

        @if (loadingGroups()) {
          <span class="muted">Loading…</span>
        } @else if (allGroups().length === 0) {
          <div class="muted">
            No modifier groups exist.
            <a routerLink="/catalog/modifier-groups/new">Create one first</a>.
          </div>
        } @else {
          <div class="modgroup-grid">
            @for (g of allGroups(); track g.id) {
              <label class="modgroup-row">
                <input type="checkbox"
                       [checked]="isAttached(g.id)"
                       (change)="toggleGroup(g.id, $any($event.target).checked)" />
                <span>
                  <strong>{{ g.name }}</strong>
                  <small class="muted">
                    · {{ g.isRequired ? 'required' : 'optional' }}
                    · {{ g.minSelect }}–{{ g.maxSelect }}
                    · {{ g.modifierCount }} options
                  </small>
                </span>
              </label>
            }
          </div>
          <div class="form-actions" style="margin-top:0.75rem;">
            <button type="button" class="btn btn-primary" [disabled]="savingGroups()" (click)="saveGroups()">
              {{ savingGroups() ? 'Saving…' : 'Save attachments' }}
            </button>
          </div>
        }
        </div>
      </section>
    }
  `,
  styles: [`
    /* Flag-row: a wrapping row of toggle-pills (defined in global styles.scss). */
    .flag-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    /* Modifier-groups picker still lives outside the main form-card; restyle it
       to feel consistent with the new card system. */
    .modgroup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.55rem;
    }
    .modgroup-row {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      padding: 0.65rem 0.85rem;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--t-fast);
      &:hover { background: var(--c-surface-hover); border-color: var(--c-border-strong); }
      input { accent-color: var(--c-primary); margin-top: 0.2rem; }
      small { display: block; margin-top: 0.15rem; color: var(--c-text-subtle); }
    }
  `]
})
export class ProductEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly brandsApi = inject(BrandsApi);
  private readonly taxRatesApi = inject(TaxRatesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);
  protected readonly brands = signal<BrandDto[]>([]);
  protected readonly taxRates = signal<TaxRateDto[]>([]);

  // Modifier-group section state (only used in edit mode)
  private readonly modifierGroupsApi = inject(ModifierGroupsApi);
  protected readonly allGroups = signal<ModifierGroupSummaryDto[]>([]);
  protected readonly attachedGroupIds = signal<Set<string>>(new Set());
  protected readonly loadingGroups = signal(true);
  protected readonly savingGroups = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    categoryId: ['', [Validators.required]],
    unitId: ['', [Validators.required]],
    brandId: [''],
    taxRateId: [''],
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    barcode: ['', [Validators.maxLength(100)]],
    basePriceAmount: [0, [Validators.required, Validators.min(0)]],
    basePriceCurrency: ['PKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    costPriceAmount: [null as number | null, [Validators.min(0)]],
    costPriceCurrency: ['', []],
    type: [ProductType.Goods, [Validators.required]],
    imageUrl: ['', [Validators.maxLength(500)]],
    hsnCode: ['', [Validators.maxLength(50)]],
    reorderPoint: [null as number | null, [Validators.min(0)]],
    weight: [null as number | null, [Validators.min(0)]],
    isTaxable: [true],
    isSold: [true],
    isPurchased: [true],
    isStockTracked: [false]
  });

  constructor() {
    this.categoriesApi.list().subscribe(list => this.categories.set(list));
    this.unitsApi.list().subscribe(list => this.units.set(list));
    this.brandsApi.list().subscribe({ next: list => this.brands.set(list), error: () => {} });
    this.taxRatesApi.list().subscribe({ next: list => this.taxRates.set(list), error: () => {} });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(p => this.form.patchValue({
        categoryId: p.categoryId,
        unitId: p.unitId,
        brandId: p.brandId ?? '',
        taxRateId: p.taxRateId ?? '',
        sku: p.sku,
        name: p.name,
        description: p.description ?? '',
        barcode: p.barcode ?? '',
        basePriceAmount: p.basePriceAmount,
        basePriceCurrency: p.basePriceCurrency,
        costPriceAmount: p.costPriceAmount,
        costPriceCurrency: p.costPriceCurrency ?? '',
        type: p.type,
        imageUrl: p.imageUrl ?? '',
        hsnCode: p.hsnCode ?? '',
        reorderPoint: p.reorderPoint,
        weight: p.weight,
        isTaxable: p.isTaxable,
        isSold: p.isSold,
        isPurchased: p.isPurchased,
        isStockTracked: p.isStockTracked
      }));
      this.loadModifierGroups(routeId);
    }
  }

  private loadModifierGroups(productId: string): void {
    this.modifierGroupsApi.list().subscribe({
      next: list => this.allGroups.set(list),
      error: () => {}
    });
    this.modifierGroupsApi.getForProduct(productId).subscribe({
      next: attached => {
        this.attachedGroupIds.set(new Set(attached.map(g => g.id)));
        this.loadingGroups.set(false);
      },
      error: () => this.loadingGroups.set(false)
    });
  }

  isAttached(groupId: string): boolean {
    return this.attachedGroupIds().has(groupId);
  }

  toggleGroup(groupId: string, checked: boolean): void {
    const next = new Set(this.attachedGroupIds());
    if (checked) next.add(groupId); else next.delete(groupId);
    this.attachedGroupIds.set(next);
  }

  saveGroups(): void {
    const productId = this.id();
    if (!productId) return;
    this.savingGroups.set(true);
    this.modifierGroupsApi.setForProduct(productId, {
      modifierGroupIds: [...this.attachedGroupIds()]
    }).subscribe({
      next: () => { this.notify.success('Attachments saved.'); this.savingGroups.set(false); },
      error: err => { this.savingGroups.set(false); this.notify.error(userMessage(err)); }
    });
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
    if (c.errors['maxlength']) return 'Too long.';
    if (c.errors['min']) return 'Must be 0 or greater.';
    if (c.errors['pattern']) return field === 'basePriceCurrency'
      ? 'Must be a 3-letter currency code.'
      : 'Invalid format.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const costAmt = raw.costPriceAmount;
    const costCcy = raw.costPriceCurrency?.trim().toUpperCase() || null;

    const body = {
      categoryId: raw.categoryId,
      unitId: raw.unitId,
      brandId: raw.brandId || null,
      taxRateId: raw.taxRateId || null,
      sku: raw.sku.trim(),
      name: raw.name.trim(),
      description: raw.description?.trim() || null,
      barcode: raw.barcode?.trim() || null,
      basePriceAmount: Number(raw.basePriceAmount),
      basePriceCurrency: raw.basePriceCurrency.toUpperCase(),
      costPriceAmount: costAmt != null ? Number(costAmt) : null,
      costPriceCurrency: costAmt != null ? (costCcy || raw.basePriceCurrency.toUpperCase()) : null,
      type: Number(raw.type),
      imageUrl: raw.imageUrl?.trim() || null,
      hsnCode: raw.hsnCode?.trim() || null,
      reorderPoint: raw.reorderPoint != null ? Number(raw.reorderPoint) : null,
      weight: raw.weight != null ? Number(raw.weight) : null,
      isTaxable: raw.isTaxable,
      isSold: raw.isSold,
      isPurchased: raw.isPurchased,
      isStockTracked: raw.isStockTracked
    };

    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Product updated.' : 'Product created.');
        this.router.navigate(['/catalog/products']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
