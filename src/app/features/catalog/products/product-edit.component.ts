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
        <p class="muted">Menu item / SKU.</p>
      </div>
      <a class="btn" routerLink="/catalog/products">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">

      <h3 class="form-section">Identification</h3>
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('sku')">
          <label>SKU</label>
          <input formControlName="sku" placeholder="BUR-001" />
          @if (invalid('sku')) { <div class="field-error">{{ errorOf('sku') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" />
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

      <div class="form-row">
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

      <h3 class="form-section">Pricing</h3>
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('basePriceAmount')">
          <label>Sale Price</label>
          <input type="number" step="0.01" min="0" formControlName="basePriceAmount" />
          @if (invalid('basePriceAmount')) { <div class="field-error">{{ errorOf('basePriceAmount') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('basePriceCurrency')">
          <label>Currency</label>
          <input formControlName="basePriceCurrency" maxlength="3" style="text-transform:uppercase;" />
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

      <h3 class="form-section">Inventory & Logistics</h3>
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('barcode')">
          <label>Barcode</label>
          <input formControlName="barcode" />
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

      <div class="field" [class.invalid]="invalid('imageUrl')">
        <label>Image URL</label>
        <input formControlName="imageUrl" placeholder="https://…" />
      </div>

      <div class="field" [class.invalid]="invalid('description')">
        <label>Description</label>
        <textarea formControlName="description" rows="3"></textarea>
      </div>

      <h3 class="form-section">Flags</h3>
      <div class="form-row">
        <label class="toggle">
          <input type="checkbox" formControlName="isTaxable" />
          <span>Taxable</span>
        </label>
        <label class="toggle">
          <input type="checkbox" formControlName="isSold" />
          <span>Sold to customers</span>
        </label>
        <label class="toggle">
          <input type="checkbox" formControlName="isPurchased" />
          <span>Purchased from suppliers</span>
        </label>
        <label class="toggle">
          <input type="checkbox" formControlName="isStockTracked" />
          <span>Stock-tracked</span>
        </label>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/products">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create product') }}
        </button>
      </div>
    </form>

    @if (isEdit()) {
      <div class="panel" style="margin-top:1rem;">
        <h2 style="margin:0 0 0.25rem; font-size:1rem;">Modifier groups</h2>
        <p class="muted" style="margin:0 0 0.75rem;">
          Pick which modifier groups customers can choose from when ordering this item.
        </p>

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
    }
  `,
  styles: [`
    .form-section {
      margin: 1rem 0 0.5rem;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      border-top: 1px solid #f3f4f6;
      padding-top: 0.75rem;
    }
    .form-section:first-child { border-top: 0; padding-top: 0; }
    .modgroup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.5rem;
    }
    .modgroup-row {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      &:hover { background: #f9fafb; }
      input { accent-color: #3b82f6; margin-top: 0.2rem; }
      small { display: block; margin-top: 0.15rem; }
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
