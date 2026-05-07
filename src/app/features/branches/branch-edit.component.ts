import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { CompaniesApi } from '../../core/api/companies.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { CompanyDto, LocationDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-branch-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Branch' : 'New Branch' }}</h1>
        <p class="muted">Outlet details and location.</p>
      </div>
      <a class="btn" routerLink="/branches">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('companyId')">
          <label>Company</label>
          <select formControlName="companyId" [attr.disabled]="isEdit() ? '' : null">
            <option value="">— select —</option>
            @for (c of companies(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
          @if (invalid('companyId')) { <div class="field-error">{{ errorOf('companyId') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Branch Name</label>
          <input formControlName="name" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('code')">
          <label>Code (uppercase, digits, hyphens)</label>
          <input formControlName="code" style="text-transform:uppercase;" />
          @if (invalid('code')) { <div class="field-error">{{ errorOf('code') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('phoneNumber')">
          <label>Phone Number</label>
          <input formControlName="phoneNumber" placeholder="+92-300-1234567" />
        </div>
      </div>

      <div class="fieldset-title">Location</div>

      <div formGroupName="location" class="form" style="gap:1rem; padding:0;">
        <div class="form-row">
          <div class="field" [class.invalid]="invalid('location.addressLine1')">
            <label>Address Line 1</label>
            <input formControlName="addressLine1" />
          </div>
          <div class="field">
            <label>Address Line 2</label>
            <input formControlName="addressLine2" />
          </div>
        </div>

        <div class="form-row">
          <div class="field"><label>City</label><input formControlName="city" /></div>
          <div class="field"><label>State / Province</label><input formControlName="state" /></div>
          <div class="field"><label>Country</label><input formControlName="country" /></div>
          <div class="field"><label>Postal Code</label><input formControlName="postalCode" /></div>
        </div>

        <div class="form-row">
          <div class="field"><label>Latitude</label><input type="number" step="any" formControlName="latitude" /></div>
          <div class="field"><label>Longitude</label><input type="number" step="any" formControlName="longitude" /></div>
          <div class="field" [class.invalid]="invalid('location.timeZone')">
            <label>Time Zone</label>
            <input formControlName="timeZone" placeholder="Asia/Karachi" />
            @if (invalid('location.timeZone')) { <div class="field-error">{{ errorOf('location.timeZone') }}</div> }
          </div>
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/branches">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create branch') }}
        </button>
      </div>
    </form>
  `
})
export class BranchEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BranchesApi);
  private readonly companiesApi = inject(CompaniesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly companies = signal<CompanyDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    companyId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9-]+$/)]],
    phoneNumber: [''],
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

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(b => {
        this.form.patchValue({
          companyId: b.companyId,
          name: b.name,
          code: b.code,
          phoneNumber: b.phoneNumber ?? '',
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
          location
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
}
