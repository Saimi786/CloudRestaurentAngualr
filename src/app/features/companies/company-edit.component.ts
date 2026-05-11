import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompaniesApi } from '../../core/api/companies.api';
import { AuthService } from '../../core/auth/auth.service';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-company-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ readonly() ? 'Company Details' : (isEdit() ? 'Edit Company' : 'New Company') }}</h1>
        <p class="muted">Brand / legal entity details.</p>
      </div>
      <a class="btn" routerLink="/companies">← Back</a>
    </div>

    @if (readonly()) {
      <div class="readonly-banner">
        <span class="icon">🔒</span>
        <div>Read-only view. Only the platform SuperAdmin can edit companies.</div>
      </div>
    }

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('legalName')">
          <label>Legal Name</label>
          <input formControlName="legalName" />
          @if (invalid('legalName')) { <div class="field-error">{{ errorOf('legalName') }}</div> }
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('defaultCurrency')">
          <label>Currency (ISO 4217)</label>
          <input formControlName="defaultCurrency" maxlength="3" style="text-transform:uppercase;" />
          @if (invalid('defaultCurrency')) { <div class="field-error">{{ errorOf('defaultCurrency') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('taxRegistrationNumber')">
          <label>Tax Registration #</label>
          <input formControlName="taxRegistrationNumber" />
          @if (invalid('taxRegistrationNumber')) { <div class="field-error">{{ errorOf('taxRegistrationNumber') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/companies">{{ readonly() ? 'Back' : 'Cancel' }}</a>
        @if (!readonly()) {
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create company') }}
          </button>
        }
      </div>
    </form>
  `,
  styles: [`
    .readonly-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: var(--c-info-soft);
      border: 1px solid #bae6fd;
      color: var(--c-info-fg);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1rem;
      font-size: 0.875rem;
      .icon { font-size: 1.3rem; }
    }
  `]
})
export class CompanyEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CompaniesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly readonly = computed(() => !this.auth.hasRole('SuperAdmin'));
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: ['', [Validators.required, Validators.maxLength(300)]],
    defaultCurrency: ['PKR', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    taxRegistrationNumber: ['']
  });

  constructor() {
    if (this.readonly() && this.route.snapshot.paramMap.get('id') === 'new') {
      this.notify.error('Only SuperAdmin can create companies.');
      this.router.navigate(['/companies']);
      return;
    }
    if (this.readonly()) {
      this.form.disable({ emitEvent: false });
    }

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(c => this.form.patchValue({
        name: c.name,
        legalName: c.legalName,
        defaultCurrency: c.defaultCurrency,
        taxRegistrationNumber: c.taxRegistrationNumber ?? ''
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
    if (c.errors['maxlength']) return `Too long.`;
    if (c.errors['pattern']) return field === 'defaultCurrency'
      ? 'Must be a 3-letter currency code.'
      : 'Invalid format.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      legalName: raw.legalName.trim(),
      defaultCurrency: raw.defaultCurrency.toUpperCase(),
      taxRegistrationNumber: raw.taxRegistrationNumber?.trim() || null
    };

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, ...body })
      : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Company updated.' : 'Company created.');
        this.router.navigate(['/companies']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err))
          this.notify.error(userMessage(err));
      }
    });
  }
}
