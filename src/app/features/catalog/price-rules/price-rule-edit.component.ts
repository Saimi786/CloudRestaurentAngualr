import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { PriceRulesApi } from '../../../core/api/price-rules.api';
import { ProductsApi } from '../../../core/api/products.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto, ProductDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-price-rule-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Price Rule' : 'New Price Rule' }}</h1>
        <p class="muted">Override the Product's base price within an optional branch / day / time window.</p>
      </div>
      <a class="btn" routerLink="/catalog/price-rules">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('productId')">
          <label>Product</label>
          <select formControlName="productId">
            <option value="">— select —</option>
            @for (p of products(); track p.id) {
              <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
            }
          </select>
          @if (isEdit()) { <small class="muted">Product can't be changed after creation.</small> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Rule Name</label>
          <input formControlName="name" placeholder="Happy hour 5-7pm" />
        </div>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Branch (optional)</label>
          <select formControlName="branchId">
            <option value="">All branches</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('overridePriceAmount')">
          <label>Override Price</label>
          <input type="number" step="0.01" min="0" formControlName="overridePriceAmount" />
        </div>
        <div class="field" [class.invalid]="invalid('overridePriceCurrency')">
          <label>Currency</label>
          <input formControlName="overridePriceCurrency" maxlength="3" style="text-transform:uppercase;" />
        </div>
        <div class="field" [class.invalid]="invalid('priority')">
          <label>Priority</label>
          <input type="number" min="0" formControlName="priority" />
        </div>
      </div>

      <div class="fieldset-title">Time window (optional)</div>
      <div class="form-row">
        <div class="field">
          <label>Start time</label>
          <input type="time" formControlName="startTime" />
        </div>
        <div class="field">
          <label>End time</label>
          <input type="time" formControlName="endTime" />
        </div>
      </div>
      <small class="muted">Leave both empty for "all day". Both required if either is set.</small>

      <div class="fieldset-title">Days of week</div>
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

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/price-rules">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create rule') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .day-toggle {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 0.7rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      &:hover { background: #f9fafb; }
      input { accent-color: #3b82f6; }
    }
  `]
})
export class PriceRuleEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PriceRulesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly dayLabels = DAY_LABELS;
  protected readonly daysOfWeek = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    branchId: [''],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    startTime: [''],
    endTime: [''],
    overridePriceAmount: [0, [Validators.required, Validators.min(0)]],
    overridePriceCurrency: ['PKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    priority: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    this.productsApi.list({}).subscribe(list => this.products.set(list));
    this.branchesApi.list().subscribe(list => this.branches.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.form.controls.productId.disable();
      this.api.get(routeId).subscribe(r => {
        this.form.patchValue({
          productId: r.productId,
          branchId: r.branchId ?? '',
          name: r.name,
          startTime: r.startTime?.substring(0, 5) ?? '',
          endTime: r.endTime?.substring(0, 5) ?? '',
          overridePriceAmount: r.overridePriceAmount,
          overridePriceCurrency: r.overridePriceCurrency,
          priority: r.priority
        });
        this.daysOfWeek.set(r.daysOfWeek);
      });
    }
  }

  hasDay(index: number): boolean {
    return (this.daysOfWeek() & (1 << index)) !== 0;
  }

  toggleDay(index: number, checked: boolean): void {
    const bit = 1 << index;
    this.daysOfWeek.update(v => checked ? v | bit : v & ~bit);
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();

    if (!!raw.startTime !== !!raw.endTime) {
      this.notify.error('Start and end times must both be set or both empty.');
      return;
    }

    this.saving.set(true);
    const startTime = raw.startTime ? raw.startTime + ':00' : null;  // TimeOnly "HH:mm:ss"
    const endTime = raw.endTime ? raw.endTime + ':00' : null;

    const body = {
      branchId: raw.branchId || null,
      name: raw.name.trim(),
      startTime,
      endTime,
      daysOfWeek: this.daysOfWeek(),
      overridePriceAmount: Number(raw.overridePriceAmount),
      overridePriceCurrency: raw.overridePriceCurrency.toUpperCase(),
      priority: Number(raw.priority)
    };

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, ...body })
      : this.api.create({ productId: raw.productId, ...body });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Rule updated.' : 'Rule created.');
        this.router.navigate(['/catalog/price-rules']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
