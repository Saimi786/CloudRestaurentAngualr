import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TaxRatesApi } from '../../core/api/tax-rates.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-tax-rate-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Tax Rate' : 'New Tax Rate' }}</h1>
        <p class="muted">Applied to taxable products at sale time.</p>
      </div>
      <a class="btn" routerLink="/tax-rates">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="e.g. GST 18%" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('percentage')">
          <label>Percentage</label>
          <input type="number" step="0.01" min="0" max="100" formControlName="percentage" />
          @if (invalid('percentage')) { <div class="field-error">{{ errorOf('percentage') }}</div> }
        </div>
      </div>

      <div class="form-row">
        <label class="toggle">
          <input type="checkbox" formControlName="isCompound" />
          <span>Compound — calculate after subtotal (cumulative on top of other taxes).</span>
        </label>
        <label class="toggle">
          <input type="checkbox" formControlName="isDefault" />
          <span>Default rate — applied to taxable products with no explicit tax assigned.</span>
        </label>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/tax-rates">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create rate') }}
        </button>
      </div>
    </form>
  `
})
export class TaxRateEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TaxRatesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    isCompound: [false],
    isDefault: [false]
  });

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(t => this.form.patchValue({
        name: t.name,
        percentage: t.percentage,
        isCompound: t.isCompound,
        isDefault: t.isDefault
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
    if (c.errors['max']) return 'Must be 100 or less.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      percentage: Number(raw.percentage),
      isCompound: raw.isCompound,
      isDefault: raw.isDefault
    };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Tax rate updated.' : 'Tax rate created.');
        this.router.navigate(['/tax-rates']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
