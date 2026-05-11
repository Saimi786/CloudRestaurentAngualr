import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlatformTenantsApi } from '../../core/api/platform-tenants.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BusinessType, PlatformTenantDetails, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

interface PlanOption {
  value: SubscriptionPlan;
  name: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

@Component({
  selector: 'app-platform-tenant-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Tenant' : 'New Tenant' }}</h1>
        <p>{{ isEdit() ? 'Update name and subscription plan.' : 'Spin up a new business on the platform, with an initial admin account.' }}</p>
      </div>
      <a class="btn" routerLink="/platform/tenants">← Back to list</a>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading tenant…</div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <!-- ============ Tenant info ============ -->
        <section class="panel">
          <h2>Business details</h2>
          <p class="muted small">Name on receipts and dashboards. Slug is the URL-safe identifier.</p>

          <div class="form-row">
            <div class="field" [class.invalid]="invalid('name')">
              <label>Business name</label>
              <input formControlName="name" placeholder="Acme Burgers" />
              @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
            </div>
            <div class="field" [class.invalid]="invalid('slug')">
              <label>Slug</label>
              <input formControlName="slug" placeholder="acme-burgers" style="text-transform:lowercase;" [readonly]="isEdit()" />
              <small>Lowercase letters, digits, hyphens. Fixed after creation.</small>
              @if (invalid('slug')) { <div class="field-error">{{ errorOf('slug') }}</div> }
            </div>
          </div>

          @if (!isEdit()) {
            <div class="form-row">
              <div class="field">
                <label>Vertical (business type)</label>
                <select formControlName="businessType">
                  <option [ngValue]="0">Restaurant</option>
                  <option [ngValue]="1">Retail</option>
                  <option [ngValue]="2">Wholesale</option>
                </select>
                <small>Locked after creation — different verticals share no data.</small>
              </div>
            </div>
          }
        </section>

        <!-- ============ Plan picker ============ -->
        <section class="panel">
          <h2>Subscription plan</h2>
          <p class="muted small">Choose the tier. You can change it any time — no proration today.</p>

          <div class="plan-grid">
            @for (p of plans; track p.value) {
              <label class="plan-card" [class.selected]="selectedPlan() === p.value" [class.highlight]="p.highlight">
                <input type="radio" formControlName="plan" [value]="p.value" />
                <div class="plan-head">
                  <strong>{{ p.name }}</strong>
                  @if (p.highlight) { <span class="badge badge-primary">Most popular</span> }
                </div>
                <p class="plan-tagline">{{ p.tagline }}</p>
                <ul class="plan-features">
                  @for (f of p.features; track f) {
                    <li>{{ f }}</li>
                  }
                </ul>
              </label>
            }
          </div>
        </section>

        <!-- ============ Initial admin (create only) ============ -->
        @if (!isEdit()) {
          <section class="panel">
            <h2>Initial administrator</h2>
            <p class="muted small">Seeds one user with the TenantAdmin role. They'll sign in with this email and password.</p>

            <div class="form-row">
              <div class="field" [class.invalid]="invalid('adminEmail')">
                <label>Admin email</label>
                <input type="email" formControlName="adminEmail" placeholder="owner@acme.com" />
                @if (invalid('adminEmail')) { <div class="field-error">{{ errorOf('adminEmail') }}</div> }
              </div>
              <div class="field" [class.invalid]="invalid('adminFullName')">
                <label>Admin full name</label>
                <input formControlName="adminFullName" placeholder="Jane Owner" />
                @if (invalid('adminFullName')) { <div class="field-error">{{ errorOf('adminFullName') }}</div> }
              </div>
            </div>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('adminPassword')">
                <label>Initial password</label>
                <input type="password" formControlName="adminPassword" autocomplete="new-password" />
                <small>8+ chars with upper, lower, digit, and a symbol.</small>
                @if (invalid('adminPassword')) { <div class="field-error">{{ errorOf('adminPassword') }}</div> }
              </div>
            </div>
          </section>
        } @else {
          @if (details(); as d) {
            <section class="panel">
              <h2>Workspace snapshot</h2>
              <div class="stat-row">
                <div><span class="muted">Initial admin</span><div><strong class="mono">{{ d.adminEmail ?? 'none' }}</strong></div></div>
                <div><span class="muted">Companies</span><div><strong>{{ d.companyCount }}</strong></div></div>
                <div><span class="muted">Branches</span><div><strong>{{ d.branchCount }}</strong></div></div>
                <div><span class="muted">Users</span><div><strong>{{ d.userCount }}</strong></div></div>
              </div>
            </section>
          }
        }

        <div class="form-actions">
          <a class="btn" routerLink="/platform/tenants">Cancel</a>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create tenant') }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .form-grid {
      display: grid;
      gap: 1rem;
      max-width: 920px;
    }
    h2 { font-size: 1.05rem; margin: 0 0 0.25rem; }
    .panel > h2 + .small { margin-bottom: 1rem; }

    .plan-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
      margin-top: 0.75rem;
    }
    .plan-card {
      position: relative;
      padding: 1rem 1rem 0.85rem;
      border: 2px solid var(--c-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--t-fast);
      background: var(--c-surface);
      display: block;
      input { position: absolute; opacity: 0; pointer-events: none; }
      &:hover { border-color: var(--c-border-strong); }
      &.highlight {
        border-color: var(--c-primary-soft-strong);
        background: linear-gradient(180deg, var(--c-primary-soft) 0%, var(--c-surface) 100%);
      }
      &.selected {
        border-color: var(--c-primary);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
      }
    }
    .plan-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.25rem;
      strong { font-size: 1rem; }
    }
    .plan-tagline {
      margin: 0 0 0.65rem;
      color: var(--c-text-muted);
      font-size: 0.82rem;
    }
    .plan-features {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 0.3rem;
      font-size: 0.82rem;
      color: var(--c-text);
      li::before { content: '✓ '; color: var(--c-success); font-weight: 700; }
    }

    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      padding-top: 0.5rem;
      .muted { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
      strong { font-size: 1.05rem; }
      .mono { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500; }
    }
  `]
})
export class PlatformTenantEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformTenantsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly details = signal<PlatformTenantDetails | null>(null);

  protected readonly plans: PlanOption[] = [
    { value: SubscriptionPlan.Basic, name: 'Basic', tagline: 'Single outlet, the essentials.',
      features: ['1 branch', '5 users', 'POS + Kitchen', 'Email support'] },
    { value: SubscriptionPlan.Standard, name: 'Standard', tagline: 'Small chain, full inventory.', highlight: true,
      features: ['3 branches', '15 users', 'Inventory + Recipes', 'Reports + Tax'] },
    { value: SubscriptionPlan.Premium, name: 'Premium', tagline: 'Growing brand with analytics.',
      features: ['10 branches', '50 users', 'Loyalty + CRM', 'Priority support'] },
    { value: SubscriptionPlan.Enterprise, name: 'Enterprise', tagline: 'White-glove, custom SLA.',
      features: ['Unlimited branches', 'Unlimited users', 'Dedicated DB option', 'Phone + SLA'] },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)]],
    businessType: [BusinessType.Restaurant as BusinessType],
    plan: [SubscriptionPlan.Standard as SubscriptionPlan],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminFullName: ['', [Validators.required, Validators.maxLength(200)]],
    adminPassword: ['', [
      Validators.required, Validators.minLength(8),
      Validators.pattern(/[A-Z]/), Validators.pattern(/[a-z]/),
      Validators.pattern(/[0-9]/), Validators.pattern(/[^A-Za-z0-9]/)
    ]],
  });

  protected readonly selectedPlan = computed(() => this.form.controls.plan.value);

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.loading.set(true);
      // Edit mode — admin fields not used, drop their required validators so the form is valid.
      this.form.controls.adminEmail.clearValidators();
      this.form.controls.adminFullName.clearValidators();
      this.form.controls.adminPassword.clearValidators();
      this.form.controls.adminEmail.updateValueAndValidity();
      this.form.controls.adminFullName.updateValueAndValidity();
      this.form.controls.adminPassword.updateValueAndValidity();

      this.api.get(routeId).subscribe({
        next: t => { this.patchFromDto(t); this.details.set(t); this.loading.set(false); },
        error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
      });
    } else {
      // Auto-generate the slug from the name as the user types.
      this.form.controls.name.valueChanges.subscribe(name => {
        if (this.form.controls.slug.dirty) return;
        this.form.controls.slug.setValue(this.slugify(name ?? ''), { emitEvent: false });
      });
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(name: string): string {
    const c = this.form.get(name);
    if (!c?.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    if (c.errors['email']) return 'Invalid email.';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['pattern']) {
      if (name === 'slug') return 'Lowercase letters/digits/hyphens only, no leading/trailing hyphen.';
      if (name === 'adminPassword') return 'Need upper, lower, digit, and symbol.';
      return 'Invalid format.';
    }
    if (c.errors['maxlength']) return 'Too long.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const obs = this.isEdit()
      ? this.api.update(this.id()!, {
          name: raw.name.trim(),
          plan: raw.plan
        })
      : this.api.create({
          name: raw.name.trim(),
          slug: raw.slug.trim().toLowerCase(),
          businessType: raw.businessType,
          plan: raw.plan,
          adminEmail: raw.adminEmail.trim(),
          adminFullName: raw.adminFullName.trim(),
          adminPassword: raw.adminPassword
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Tenant updated.' : 'Tenant created.');
        this.router.navigate(['/platform/tenants']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  private slugify(s: string): string {
    return s.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private patchFromDto(t: PlatformTenantDetails): void {
    this.form.patchValue({
      name: t.name,
      slug: t.slug,
      businessType: t.businessType,
      plan: t.plan
    });
  }
}
