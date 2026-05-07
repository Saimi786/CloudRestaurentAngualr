import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriesApi } from '../../../core/api/categories.api';
import { ProductsApi } from '../../../core/api/products.api';
import { UnitsApi } from '../../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { CategoryDto, UnitDto } from '../../../core/models';
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
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('basePriceAmount')">
          <label>Base Price</label>
          <input type="number" step="0.01" min="0" formControlName="basePriceAmount" />
          @if (invalid('basePriceAmount')) { <div class="field-error">{{ errorOf('basePriceAmount') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('basePriceCurrency')">
          <label>Currency</label>
          <input formControlName="basePriceCurrency" maxlength="3" style="text-transform:uppercase;" />
          @if (invalid('basePriceCurrency')) { <div class="field-error">{{ errorOf('basePriceCurrency') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('barcode')">
          <label>Barcode (optional)</label>
          <input formControlName="barcode" />
        </div>
      </div>

      <div class="field" [class.invalid]="invalid('description')">
        <label>Description</label>
        <textarea formControlName="description" rows="3"></textarea>
      </div>

      <div class="field">
        <label class="toggle">
          <input type="checkbox" formControlName="isStockTracked" />
          <span>Stock tracked — record purchases / wastage / adjustments and see balances per branch.</span>
        </label>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/products">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create product') }}
        </button>
      </div>
    </form>
  `
})
export class ProductEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    categoryId: ['', [Validators.required]],
    unitId: ['', [Validators.required]],
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    barcode: ['', [Validators.maxLength(100)]],
    basePriceAmount: [0, [Validators.required, Validators.min(0)]],
    basePriceCurrency: ['PKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    isStockTracked: [false]
  });

  constructor() {
    this.categoriesApi.list().subscribe(list => this.categories.set(list));
    this.unitsApi.list().subscribe(list => this.units.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(p => this.form.patchValue({
        categoryId: p.categoryId,
        unitId: p.unitId,
        sku: p.sku,
        name: p.name,
        description: p.description ?? '',
        barcode: p.barcode ?? '',
        basePriceAmount: p.basePriceAmount,
        basePriceCurrency: p.basePriceCurrency,
        isStockTracked: p.isStockTracked
      }));
    }
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

    const body = {
      categoryId: raw.categoryId,
      unitId: raw.unitId,
      sku: raw.sku.trim(),
      name: raw.name.trim(),
      description: raw.description?.trim() || null,
      barcode: raw.barcode?.trim() || null,
      basePriceAmount: Number(raw.basePriceAmount),
      basePriceCurrency: raw.basePriceCurrency.toUpperCase(),
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
