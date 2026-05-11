import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { CompaniesApi } from '../../core/api/companies.api';
import { TenantsApi } from '../../core/api/tenants.api';
import { AuthService } from '../../core/auth/auth.service';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { CompanyDto, LocationDto, ReceiptTemplate, TenantDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-branch-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ readonly() ? 'Branch Details' : (isEdit() ? 'Edit Branch' : 'New Branch') }}</h1>
        <p>Operational outlet — address, contact info, receipt template, and status.</p>
      </div>
      <div class="actions">
        <a class="btn" routerLink="/branches">← Back to list</a>
      </div>
    </div>

    @if (readonly()) {
      <div class="readonly-banner">
        <span class="icon">🔒</span>
        <div>Read-only view. Only the platform SuperAdmin can edit branches.</div>
      </div>
    }

    <form [formGroup]="form" (ngSubmit)="submit()" class="branch-form">
      <!-- ============ Identity ============ -->
      <section class="card">
        <div class="card-head">
          <h2>🏷️ Identity</h2>
          <small class="muted">Which company this outlet belongs to, plus its display name and code.</small>
        </div>
        <div class="card-body">
          <div class="form-row">
            <div class="field" [class.invalid]="invalid('companyId')">
              <label>Company</label>
              <select formControlName="companyId" [attr.disabled]="isEdit() ? '' : null">
                <option value="">— select —</option>
                @for (c of companies(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (isEdit()) { <small>Cannot be changed after creation.</small> }
              @if (invalid('companyId')) { <div class="field-error">{{ errorOf('companyId') }}</div> }
            </div>
            <div class="field" [class.invalid]="invalid('name')">
              <label>Branch Name</label>
              <input formControlName="name" placeholder="e.g. Main Branch — Karachi" />
              @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
            </div>
          </div>
          <div class="form-row">
            <div class="field" [class.invalid]="invalid('code')">
              <label>Code</label>
              <input formControlName="code" style="text-transform:uppercase;" placeholder="MAIN-KHI" maxlength="50" />
              <small>Uppercase letters, digits, hyphens. Used on receipts and reports.</small>
              @if (invalid('code')) { <div class="field-error">{{ errorOf('code') }}</div> }
            </div>
            <div class="field" [class.invalid]="invalid('phoneNumber')">
              <label>Phone Number</label>
              <input formControlName="phoneNumber" placeholder="+92-300-1234567" />
              <small>Shown on the receipt footer.</small>
            </div>
            @if (isEdit()) {
              <div class="field status-field">
                <label>Status</label>
                <label class="status-toggle" [class.active]="form.controls.isActive.value" [class.inactive]="!form.controls.isActive.value">
                  <input type="checkbox" formControlName="isActive" />
                  <span class="status-pill">
                    <span class="status-dot"></span>
                    {{ form.controls.isActive.value ? 'Active' : 'Deactivated' }}
                  </span>
                </label>
                <small>Deactivated branches can't open new orders.</small>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ============ Location ============ -->
      <section class="card">
        <div class="card-head">
          <h2>📍 Location</h2>
          <small class="muted">Street address, geo-coordinates, and operating time zone.</small>
        </div>
        <div class="card-body" formGroupName="location">
          <div class="form-row">
            <div class="field span-2" [class.invalid]="invalid('location.addressLine1')">
              <label>Address Line 1</label>
              <input formControlName="addressLine1" placeholder="123 Main Street" />
            </div>
            <div class="field span-2">
              <label>Address Line 2</label>
              <input formControlName="addressLine2" placeholder="Suite, floor, building" />
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>City</label><input formControlName="city" placeholder="Karachi" /></div>
            <div class="field"><label>State / Province</label><input formControlName="state" placeholder="Sindh" /></div>
            <div class="field"><label>Country</label><input formControlName="country" placeholder="Pakistan" /></div>
            <div class="field"><label>Postal Code</label><input formControlName="postalCode" placeholder="75500" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Latitude</label><input type="number" step="any" formControlName="latitude" placeholder="24.8607" /></div>
            <div class="field"><label>Longitude</label><input type="number" step="any" formControlName="longitude" placeholder="67.0011" /></div>
            <div class="field span-2" [class.invalid]="invalid('location.timeZone')">
              <label>Time Zone</label>
              <input formControlName="timeZone" placeholder="Asia/Karachi" />
              <small>IANA name — e.g. <code>Asia/Karachi</code>, <code>Asia/Dubai</code>, <code>UTC</code>.</small>
              @if (invalid('location.timeZone')) { <div class="field-error">{{ errorOf('location.timeZone') }}</div> }
            </div>
          </div>
        </div>
      </section>

      <!-- ============ Receipt & Branding (edit only) ============ -->
      @if (isEdit()) {
        <section class="card">
          <div class="card-head">
            <h2>🧾 Receipt &amp; Branding</h2>
            <small class="muted">Receipt template per branch; the logo is shared across the entire tenant.</small>
          </div>
          <div class="card-body">
            <div class="form-row">
              <div class="field">
                <label>Receipt Template</label>
                <select formControlName="receiptTemplate">
                  <option [ngValue]="0">Compact (80mm thermal)</option>
                  <option [ngValue]="1">Classic (A4 / Letter)</option>
                </select>
              </div>
              <div class="field span-2">
                <label>Receipt Footer Text</label>
                <input formControlName="receiptFooterText" placeholder="Thank you — please come again" maxlength="500" />
              </div>
            </div>

            <div class="form-row">
              <div class="field logo-field">
                <label>Tenant Logo</label>
                <div class="logo-row">
                  <div class="logo-thumb">
                    @if (logoSrc()) {
                      <img [src]="logoSrc()" alt="Tenant logo" />
                    } @else {
                      <span class="logo-empty">No logo</span>
                    }
                  </div>
                  <div class="logo-uploader">
                    <input type="file" id="logo-upload" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                           (change)="onLogoFile($event)" [disabled]="uploadingLogo()" hidden />
                    <label for="logo-upload" class="btn btn-sm" [class.disabled]="uploadingLogo()">
                      {{ uploadingLogo() ? 'Uploading…' : (logoSrc() ? '↻ Replace logo' : '⬆ Upload logo') }}
                    </label>
                    <small>PNG, JPG, WEBP, or SVG · up to 2 MB · shared across every branch in this tenant</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- ============ Sticky action bar ============ -->
      <div class="action-bar">
        <a class="btn" routerLink="/branches">{{ readonly() ? '← Back' : 'Cancel' }}</a>
        @if (!readonly()) {
          <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving()">
            {{ saving() ? 'Saving…' : (isEdit() ? '✓ Save Changes' : '+ Create Branch') }}
          </button>
        }
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }

    .branch-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 1080px;
      padding-bottom: 5rem; /* space for sticky action bar */
    }

    /* ---- Card layout ---- */
    .card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
      overflow: hidden;
    }
    .card-head {
      padding: 1rem 1.5rem 0.75rem;
      border-bottom: 1px solid var(--c-divider);
      background: linear-gradient(180deg, var(--c-surface-alt) 0%, transparent 100%);

      h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
      small {
        display: block;
        margin-top: 0.2rem;
        font-size: 0.78rem;
      }
    }
    .card-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.85rem 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;

      &.span-2 { grid-column: span 2; }
      @media (max-width: 700px) { &.span-2 { grid-column: span 1; } }

      label {
        font-size: 0.74rem;
        font-weight: 600;
        color: var(--c-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      input, select, textarea {
        padding: 0.55rem 0.8rem;
        font-family: inherit;
        font-size: 0.9rem;
        border: 1px solid var(--c-border-strong);
        border-radius: var(--radius-md);
        background: var(--c-surface);
        color: var(--c-text);
        transition: border-color var(--t-fast), box-shadow var(--t-fast);

        &::placeholder { color: var(--c-text-subtle); }
        &:focus {
          outline: none;
          border-color: var(--c-primary);
          box-shadow: var(--shadow-focus);
        }
        &:disabled, &[disabled] {
          background: var(--c-surface-alt);
          color: var(--c-text-muted);
          cursor: not-allowed;
        }
      }
      small {
        font-size: 0.74rem;
        color: var(--c-text-subtle);
        line-height: 1.4;
        code {
          background: var(--c-surface-alt);
          padding: 0 0.3rem;
          border-radius: 4px;
          font-size: 0.78rem;
        }
      }
      &.invalid input,
      &.invalid select,
      &.invalid textarea {
        border-color: var(--c-danger);
        &:focus { box-shadow: var(--shadow-focus-danger); }
      }
      .field-error {
        color: var(--c-danger-fg);
        font-size: 0.78rem;
        font-weight: 500;
        display: flex; align-items: center; gap: 0.25rem;
        &::before { content: '⚠'; font-size: 0.85rem; }
      }
    }

    /* ---- Status pill toggle ---- */
    .status-toggle {
      cursor: pointer;
      display: inline-block;
      input { position: absolute; opacity: 0; pointer-events: none; }
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.95rem;
      border-radius: var(--radius-pill);
      font-size: 0.85rem;
      font-weight: 600;
      transition: all var(--t-fast);
      user-select: none;
      min-width: 140px;
      justify-content: center;

      .status-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        transition: background var(--t-fast), box-shadow var(--t-fast);
      }
    }
    .status-toggle.active .status-pill {
      background: var(--c-success-soft);
      color: var(--c-success-fg);
      .status-dot {
        background: var(--c-success);
        box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18);
      }
    }
    .status-toggle.inactive .status-pill {
      background: var(--c-danger-soft);
      color: var(--c-danger-fg);
      .status-dot { background: var(--c-danger); }
    }
    .status-toggle:hover .status-pill { filter: brightness(0.97); }

    /* ---- Logo uploader ---- */
    .logo-field { grid-column: 1 / -1; }
    .logo-row {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      @media (max-width: 540px) { flex-direction: column; }
    }
    .logo-thumb {
      width: 100px; height: 80px;
      border: 1px dashed var(--c-border-strong);
      border-radius: var(--radius-md);
      background: var(--c-surface-alt);
      display: grid; place-items: center;
      overflow: hidden;
      flex-shrink: 0;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .logo-empty {
        font-size: 0.72rem;
        color: var(--c-text-subtle);
      }
    }
    .logo-uploader {
      display: flex; flex-direction: column;
      gap: 0.4rem;
      flex: 1;

      label.btn {
        align-self: flex-start;
        cursor: pointer;
        &.disabled { pointer-events: none; opacity: 0.55; }
      }
      small {
        font-size: 0.74rem;
        color: var(--c-text-subtle);
      }
    }

    /* ---- Readonly banner ---- */
    .readonly-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: var(--c-info-soft);
      border: 1px solid #bae6fd;
      color: var(--c-info-fg);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      .icon { font-size: 1.3rem; }
    }

    /* ---- Sticky action bar ---- */
    .action-bar {
      position: sticky;
      bottom: 0;
      margin-top: 0.5rem;
      padding: 0.85rem 1.25rem;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06), var(--shadow-sm);
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
      align-items: center;

      .btn-lg { padding: 0.6rem 1.5rem; font-size: 0.95rem; }

      @media (max-width: 540px) {
        flex-direction: column-reverse;
        .btn, .btn-lg { width: 100%; justify-content: center; }
      }
    }

    /* ---- Page-header responsive tweak ---- */
    @media (max-width: 700px) {
      .branch-form { padding-bottom: 7rem; }
    }
  `]
})
export class BranchEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BranchesApi);
  private readonly companiesApi = inject(CompaniesApi);
  private readonly tenantsApi = inject(TenantsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  /** Non-SuperAdmin users see this page in read-only mode — writes are gated server-side. */
  protected readonly readonly = computed(() => !this.auth.hasRole('SuperAdmin'));
  protected readonly saving = signal(false);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly tenant = signal<TenantDto | null>(null);
  protected readonly uploadingLogo = signal(false);

  protected readonly logoSrc = computed(() => {
    const t = this.tenant();
    if (!t?.logoUrl) return null;
    if (t.logoUrl.startsWith('http')) return t.logoUrl;
    const origin = environment.apiBaseUrl.replace(/\/api\/v\d+\/?$/, '');
    return origin + t.logoUrl;
  });

  protected readonly form = this.fb.nonNullable.group({
    companyId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9-]+$/)]],
    phoneNumber: [''],
    isActive: [true],
    receiptTemplate: [0 as ReceiptTemplate],
    receiptFooterText: [''],
    location: this.fb.nonNullable.group({
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      state: [''],
      country: [''],
      postalCode: [''],
      latitude: [null as number | null],
      longitude: [null as number | null],
      timeZone: ['Asia/Karachi', [Validators.required, Validators.maxLength(50)]]
    })
  });

  constructor() {
    this.companiesApi.list().subscribe(list => this.companies.set(list));

    // Block non-SuperAdmin users from the 'new' route — POST will 403 server-side
    // anyway, but we want to fail fast instead of letting them fill the form.
    if (this.readonly() && this.route.snapshot.paramMap.get('id') === 'new') {
      this.notify.error('Only SuperAdmin can create branches.');
      this.router.navigate(['/branches']);
      return;
    }
    if (this.readonly()) {
      this.form.disable({ emitEvent: false });
    }

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.tenantsApi.getCurrent().subscribe({
        next: t => this.tenant.set(t),
        error: () => {}
      });
      this.api.get(routeId).subscribe(b => {
        this.form.patchValue({
          companyId: b.companyId,
          name: b.name,
          code: b.code,
          phoneNumber: b.phoneNumber ?? '',
          isActive: b.isActive,
          receiptTemplate: b.receiptTemplate ?? 0,
          receiptFooterText: b.receiptFooterText ?? '',
          location: {
            addressLine1: b.location.addressLine1 ?? '',
            addressLine2: b.location.addressLine2 ?? '',
            city: b.location.city ?? '',
            state: b.location.state ?? '',
            country: b.location.country ?? '',
            postalCode: b.location.postalCode ?? '',
            latitude: b.location.latitude,
            longitude: b.location.longitude,
            timeZone: b.location.timeZone
          }
        });
      });
    }
  }

  invalid(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(path: string): string {
    const c = this.form.get(path);
    if (!c?.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    if (c.errors['maxlength']) return 'Too long.';
    if (c.errors['pattern']) return path === 'code'
      ? 'Use uppercase letters, digits, and hyphens only.'
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

    const location: LocationDto = {
      addressLine1: raw.location.addressLine1?.trim() || null,
      addressLine2: raw.location.addressLine2?.trim() || null,
      city: raw.location.city?.trim() || null,
      state: raw.location.state?.trim() || null,
      country: raw.location.country?.trim() || null,
      postalCode: raw.location.postalCode?.trim() || null,
      latitude: raw.location.latitude,
      longitude: raw.location.longitude,
      timeZone: raw.location.timeZone
    };

    const obs = this.isEdit()
      ? this.api.update({
          id: this.id()!,
          name: raw.name.trim(),
          code: raw.code.toUpperCase(),
          phoneNumber: raw.phoneNumber?.trim() || null,
          location,
          receiptTemplate: raw.receiptTemplate ?? 0,
          receiptFooterText: raw.receiptFooterText?.trim() || null,
          isActive: raw.isActive
        })
      : this.api.create({
          companyId: raw.companyId,
          name: raw.name.trim(),
          code: raw.code.toUpperCase(),
          phoneNumber: raw.phoneNumber?.trim() || null,
          location
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Branch updated.' : 'Branch created.');
        this.router.navigate(['/branches']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err))
          this.notify.error(userMessage(err));
      }
    });
  }

  onLogoFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingLogo.set(true);
    this.tenantsApi.uploadLogo(file).subscribe({
      next: t => {
        this.tenant.set(t);
        this.uploadingLogo.set(false);
        this.notify.success('Logo uploaded.');
        input.value = '';
      },
      error: err => {
        this.uploadingLogo.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }
}
