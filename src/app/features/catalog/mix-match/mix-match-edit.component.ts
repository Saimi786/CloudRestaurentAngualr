import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandsApi } from '../../../core/api/brands.api';
import { CategoriesApi } from '../../../core/api/categories.api';
import { MixMatchApi } from '../../../core/api/mix-match.api';
import { ProductsApi } from '../../../core/api/products.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { BrandDto, CategoryDto, MixMatchType, ProductDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-mix-match-edit',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Mix & Match Group' : 'Add Mix & Match Group' }}</h1>
      </div>
      <a class="btn" routerLink="/catalog/mix-match">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name *</label>
          <input formControlName="name" />
        </div>
        <div class="field" [class.invalid]="invalid('type')">
          <label>Type *</label>
          <select formControlName="type" (change)="onTypeChanged()">
            <option [value]="MixMatchType.DiscountAmount">Discount Amount</option>
            <option [value]="MixMatchType.PercentDiscount">Percent Off</option>
            <option [value]="MixMatchType.FixedPrice">Fixed Price</option>
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('quantity')">
          <label>Quantity *</label>
          <input type="number" min="1" step="1" formControlName="quantity" />
        </div>
        <div class="field" [class.invalid]="invalid('discountValue')">
          <label>{{ discountLabel() }} *</label>
          <input type="number" min="0" step="0.01" formControlName="discountValue" />
        </div>
        <div class="field">
          <label>Priority</label>
          <input type="number" min="0" formControlName="priority" />
        </div>
        <div class="field">
          <label>Stackable</label>
          <label class="switch" style="height:38px;align-items:center;">
            <input type="checkbox" formControlName="stackable" />
            <span style="font-weight:normal;">{{ form.controls.stackable.value ? 'Stacks with others' : 'Best-of only' }}</span>
          </label>
          <small class="muted">If off, only the highest-discount non-stackable group applies.</small>
        </div>
      </div>

      <!-- Limited Dates --------------------------------------------- -->
      <div class="section-toggle">
        <label class="switch">
          <input type="checkbox" [(ngModel)]="datesEnabled" [ngModelOptions]="{standalone: true}" />
          <span>Limited Dates</span>
        </label>
      </div>
      @if (datesEnabled) {
        <div class="form-row">
          <div class="field">
            <label>Start Date</label>
            <input type="date" formControlName="startDate" />
          </div>
          <div class="field">
            <label>End Date</label>
            <input type="date" formControlName="endDate" />
          </div>
        </div>
        <div class="days-grid">
          @for (label of dayLabels; track label; let i = $index) {
            <label class="day-toggle">
              <input type="checkbox"
                     [checked]="hasDay(i)"
                     (change)="toggleDay(i, $any($event.target).checked)" />
              <span>{{ label }}</span>
            </label>
          }
        </div>
        <small class="muted">Pick none = applies every day.</small>
      }

      <!-- Time Restricted -------------------------------------------- -->
      <div class="section-toggle">
        <label class="switch">
          <input type="checkbox" [(ngModel)]="timeEnabled" [ngModelOptions]="{standalone: true}" />
          <span>Time Restricted</span>
        </label>
      </div>
      @if (timeEnabled) {
        <div class="form-row">
          <div class="field">
            <label>Start Time</label>
            <input type="time" formControlName="startTime" />
          </div>
          <div class="field">
            <label>End Time</label>
            <input type="time" formControlName="endTime" />
          </div>
        </div>
      }

      <!-- Attach Products -------------------------------------------- -->
      <div class="section-toggle">
        <label class="switch">
          <input type="checkbox" [(ngModel)]="attachEnabled" [ngModelOptions]="{standalone: true}" />
          <span>Attach Products</span>
        </label>
      </div>

      @if (attachEnabled) {
        <div class="filter-grid">
          <div class="field">
            <label>Filter by Category</label>
            <select [(ngModel)]="filterCategoryId" [ngModelOptions]="{standalone: true}">
              <option value="">— any —</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.fullPath || c.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Filter by Brand</label>
            <select [(ngModel)]="filterBrandId" [ngModelOptions]="{standalone: true}">
              <option value="">— any —</option>
              @for (b of brands(); track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Search by Name / SKU</label>
            <input type="text" [(ngModel)]="searchTerm" [ngModelOptions]="{standalone: true}"
                   placeholder="Search…" />
          </div>
          <div class="field" style="align-self: end;">
            <button type="button" class="btn btn-primary" (click)="addFiltered()">
              + Add filtered
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 32px;"></th>
              <th>SKU</th>
              <th>Product Name</th>
              <th style="text-align:right;">Unit Cost</th>
              <th style="text-align:right;">Retail Price</th>
              <th style="text-align:right;">Net Margin</th>
            </tr>
          </thead>
          <tbody>
            @if (selectedRows().length === 0) {
              <tr><td colspan="6" class="empty">No products attached.</td></tr>
            } @else {
              @for (p of selectedRows(); track p.id) {
                <tr>
                  <td>
                    <button type="button" class="btn btn-sm btn-danger"
                            (click)="removeProduct(p.id)" title="Remove">×</button>
                  </td>
                  <td class="mono">{{ p.sku }}</td>
                  <td>{{ p.name }}</td>
                  <td style="text-align:right;" class="mono">
                    {{ p.costPriceAmount != null ? (p.costPriceAmount | number:'1.2-2') : '—' }}
                  </td>
                  <td style="text-align:right;" class="mono">{{ p.basePriceAmount | number:'1.2-2' }}</td>
                  <td style="text-align:right;" class="mono">{{ marginOf(p) }}</td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (filteredAvailable().length > 0) {
          <details class="panel" style="margin-top:1rem;">
            <summary>Pick from {{ filteredAvailable().length }} matching product(s)</summary>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 32px;"></th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th style="text-align:right;">Retail</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredAvailable(); track p.id) {
                  <tr>
                    <td>
                      <button type="button" class="btn btn-sm" (click)="addProduct(p.id)">+</button>
                    </td>
                    <td class="mono">{{ p.sku }}</td>
                    <td>{{ p.name }}</td>
                    <td style="text-align:right;" class="mono">{{ p.basePriceAmount | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </details>
        }
      }

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/mix-match">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create group') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .section-toggle {
      margin-top: 1.25rem; padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }
    .switch { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600; cursor: pointer; }
    .days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .day-toggle {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 0.7rem; border: 1px solid #e5e7eb;
      border-radius: 6px; cursor: pointer;
    }
    .filter-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem; margin-bottom: 1rem;
    }
    @media (max-width: 800px) { .filter-grid { grid-template-columns: 1fr 1fr; } }
  `]
})
export class MixMatchEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MixMatchApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly brandsApi = inject(BrandsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly MixMatchType = MixMatchType;
  protected readonly dayLabels = DAY_LABELS;

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly products = signal<ProductDto[]>([]);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly brands = signal<BrandDto[]>([]);
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly daysOfWeek = signal(0);

  protected datesEnabled = false;
  protected timeEnabled = false;
  protected attachEnabled = true;
  protected filterCategoryId = '';
  protected filterBrandId = '';
  protected searchTerm = '';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: [MixMatchType.DiscountAmount, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    discountValue: [0, [Validators.required, Validators.min(0)]],
    priority: [0],
    stackable: [true],
    startDate: [''],
    endDate: [''],
    startTime: [''],
    endTime: ['']
  });

  protected readonly selectedRows = computed(() => {
    const ids = this.selectedIds();
    return this.products().filter(p => ids.has(p.id));
  });

  protected readonly filteredAvailable = computed(() => {
    const selected = this.selectedIds();
    const term = this.searchTerm.trim().toLowerCase();
    return this.products()
      .filter(p => !selected.has(p.id))
      .filter(p => !this.filterCategoryId || p.categoryId === this.filterCategoryId)
      .filter(p => !this.filterBrandId || p.brandId === this.filterBrandId)
      .filter(p => !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .slice(0, 100);
  });

  constructor() {
    this.productsApi.list({}).subscribe(list => this.products.set(list));
    this.categoriesApi.list().subscribe(list => this.categories.set(list));
    this.brandsApi.list().subscribe(list => this.brands.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(g => {
        this.form.patchValue({
          name: g.name,
          type: g.type,
          quantity: g.quantity,
          discountValue: g.discountValue,
          priority: g.priority,
          stackable: g.stackable,
          startDate: g.startDate ?? '',
          endDate: g.endDate ?? '',
          startTime: g.startTime?.substring(0, 5) ?? '',
          endTime: g.endTime?.substring(0, 5) ?? ''
        });
        this.daysOfWeek.set(g.daysOfWeek);
        this.datesEnabled = !!(g.startDate || g.endDate);
        this.timeEnabled = !!(g.startTime || g.endTime);
        this.attachEnabled = g.products.length > 0;
        this.selectedIds.set(new Set(g.products.map(p => p.productId)));
      });
    }
  }

  discountLabel(): string {
    const t = Number(this.form.controls.type.value) as MixMatchType;
    if (t === MixMatchType.PercentDiscount) return 'Percent Off';
    if (t === MixMatchType.FixedPrice) return 'Fixed Group Price';
    return 'Discount Amount';
  }

  onTypeChanged(): void { /* triggers discountLabel re-eval via template */ }

  hasDay(index: number): boolean {
    return (this.daysOfWeek() & (1 << index)) !== 0;
  }

  toggleDay(index: number, checked: boolean): void {
    const bit = 1 << index;
    this.daysOfWeek.update(v => checked ? v | bit : v & ~bit);
  }

  addProduct(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.add(id); return n; });
  }

  removeProduct(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.delete(id); return n; });
  }

  addFiltered(): void {
    const ids = this.filteredAvailable().map(p => p.id);
    this.selectedIds.update(s => {
      const n = new Set(s);
      ids.forEach(id => n.add(id));
      return n;
    });
  }

  marginOf(p: ProductDto): string {
    if (p.costPriceAmount == null || p.costPriceAmount <= 0 || p.basePriceAmount <= 0) return '—';
    const m = ((p.basePriceAmount - p.costPriceAmount) / p.basePriceAmount) * 100;
    return m.toFixed(1) + '%';
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();

    if (this.timeEnabled && (!!raw.startTime !== !!raw.endTime)) {
      this.notify.error('Start and end times must both be set or both empty.');
      return;
    }
    if (this.datesEnabled && raw.startDate && raw.endDate && raw.endDate < raw.startDate) {
      this.notify.error('End date must be on or after start date.');
      return;
    }

    this.saving.set(true);
    const body = {
      name: raw.name.trim(),
      type: Number(raw.type) as MixMatchType,
      quantity: Number(raw.quantity),
      discountValue: Number(raw.discountValue),
      priority: Number(raw.priority),
      stackable: !!raw.stackable,
      startDate: this.datesEnabled && raw.startDate ? raw.startDate : null,
      endDate: this.datesEnabled && raw.endDate ? raw.endDate : null,
      daysOfWeek: this.datesEnabled ? (this.daysOfWeek() === 0 ? 127 : this.daysOfWeek()) : 127,
      startTime: this.timeEnabled && raw.startTime ? raw.startTime + ':00' : null,
      endTime: this.timeEnabled && raw.endTime ? raw.endTime + ':00' : null,
      productIds: Array.from(this.selectedIds())
    };

    const obs = this.isEdit()
      ? this.api.update(this.id()!, { id: this.id()!, ...body })
      : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Group updated.' : 'Group created.');
        this.router.navigate(['/catalog/mix-match']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
