import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerGroupsApi } from '../../core/api/customer-groups.api';
import { CustomersApi } from '../../core/api/customers.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import {
  ContactType,
  CustomerDto,
  CustomerGroupDto,
  Gender
} from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-customer-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Contact' : 'New Contact' }}</h1>
        <p class="muted">Customer or supplier — phone is unique when set, used for POS lookup.</p>
      </div>
      <a class="btn" routerLink="/customers">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">

      <h3 class="form-section">Identity</h3>
      <div class="form-row">
        <div class="field">
          <label>Type</label>
          <select formControlName="type">
            <option [value]="0">Customer</option>
            <option [value]="1">Supplier</option>
            <option [value]="2">Both</option>
            <option [value]="3">Walk-in</option>
          </select>
        </div>
        <div class="field" [class.invalid]="invalid('fullName')">
          <label>Full Name</label>
          <input formControlName="fullName" />
          @if (invalid('fullName')) { <div class="field-error">{{ errorOf('fullName') }}</div> }
        </div>
        @if (showSupplierFields()) {
          <div class="field" [class.invalid]="invalid('supplierBusinessName')">
            <label>Business Name</label>
            <input formControlName="supplierBusinessName" placeholder="Acme Foods Pvt Ltd" />
            @if (invalid('supplierBusinessName')) { <div class="field-error">{{ errorOf('supplierBusinessName') }}</div> }
          </div>
        }
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('phone')">
          <label>Phone</label>
          <input formControlName="phone" placeholder="+92-300-1234567" />
          @if (invalid('phone')) { <div class="field-error">{{ errorOf('phone') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('email')">
          <label>Email</label>
          <input type="email" formControlName="email" />
          @if (invalid('email')) { <div class="field-error">{{ errorOf('email') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('taxNumber')">
          <label>Tax / NTN</label>
          <input formControlName="taxNumber" placeholder="NTN / CNIC" />
        </div>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Customer Group</label>
          <select formControlName="customerGroupId">
            <option value="">— none —</option>
            @for (g of customerGroups(); track g.id) {
              <option [value]="g.id">{{ g.name }} · {{ g.discountPercent }}%</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Date of Birth</label>
          <input type="date" formControlName="dateOfBirth" />
        </div>
        <div class="field">
          <label>Gender</label>
          <select formControlName="gender">
            <option value="">— unspecified —</option>
            <option [value]="0">Male</option>
            <option [value]="1">Female</option>
            <option [value]="2">Other</option>
          </select>
        </div>
      </div>

      <h3 class="form-section">Financial</h3>
      <div class="form-row">
        <div class="field">
          <label>Opening Balance {{ isEdit() ? '(read-only)' : '' }}</label>
          <input type="number" step="0.01" min="0" formControlName="openingBalanceAmount" />
        </div>
        <div class="field">
          <label>Currency</label>
          <input formControlName="openingBalanceCurrency" maxlength="3" style="text-transform:uppercase;" />
        </div>
        <div class="field">
          <label>Credit Limit (optional)</label>
          <input type="number" step="0.01" min="0" formControlName="creditLimitAmount" placeholder="—" />
        </div>
        <div class="field">
          <label>Limit Currency</label>
          <input formControlName="creditLimitCurrency" maxlength="3" style="text-transform:uppercase;" placeholder="PKR" />
        </div>
      </div>

      @if (isEdit() && customer(); as c) {
        <p class="muted" style="margin-top:0.5rem;">
          Current balance:
          <strong>{{ c.currentBalanceAmount | number:'1.2-2' }} {{ c.currentBalanceCurrency }}</strong>
          (opening was {{ c.openingBalanceAmount | number:'1.2-2' }} {{ c.openingBalanceCurrency }})
        </p>
      }

      <h3 class="form-section">Billing Address</h3>
      <div formGroupName="billingAddress" class="address-block">
        <div class="form-row">
          <div class="field"><label>Line 1</label><input formControlName="line1" /></div>
          <div class="field"><label>Line 2</label><input formControlName="line2" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>City</label><input formControlName="city" /></div>
          <div class="field"><label>State</label><input formControlName="state" /></div>
          <div class="field"><label>Country</label><input formControlName="country" /></div>
          <div class="field"><label>Postal</label><input formControlName="postalCode" /></div>
        </div>
      </div>

      <h3 class="form-section">
        Shipping Address
        <button type="button" class="btn btn-sm" (click)="copyBillingToShipping()">Copy from billing</button>
      </h3>
      <div formGroupName="shippingAddress" class="address-block">
        <div class="form-row">
          <div class="field"><label>Line 1</label><input formControlName="line1" /></div>
          <div class="field"><label>Line 2</label><input formControlName="line2" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>City</label><input formControlName="city" /></div>
          <div class="field"><label>State</label><input formControlName="state" /></div>
          <div class="field"><label>Country</label><input formControlName="country" /></div>
          <div class="field"><label>Postal</label><input formControlName="postalCode" /></div>
        </div>
      </div>

      <h3 class="form-section">Notes</h3>
      <div class="field" [class.invalid]="invalid('notes')">
        <textarea formControlName="notes" rows="2"></textarea>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/customers">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create contact') }}
        </button>
      </div>
    </form>

    @if (isEdit() && customer(); as c) {
      <div class="panel" style="margin-top:1rem; max-width:720px;">
        <h2 style="margin:0 0 0.5rem; font-size:1rem;">Reward Points</h2>
        <div class="loyalty-balance">
          {{ c.totalRewardPoints }} <span class="muted" style="font-weight:400; font-size:0.85rem;">points</span>
        </div>
        <p class="muted small" style="margin:0 0 1rem;">
          Lifetime redeemed: <strong>{{ c.totalRewardPointsUsed }}</strong> ·
          Expired: <strong>{{ c.totalRewardPointsExpired }}</strong>
        </p>
        <p class="muted" style="margin:0 0 1rem;">Manual earn/redeem here adjusts the balance directly. The POS handles the real flow on sales.</p>

        <form class="form" [formGroup]="loyaltyForm" (ngSubmit)="adjust('earn')" style="gap:0.75rem;">
          <div class="form-row">
            <div class="field" [class.invalid]="loyaltyInvalid()">
              <label>Points</label>
              <input type="number" min="1" formControlName="points" />
              @if (loyaltyInvalid()) { <div class="field-error">{{ loyaltyErrorOf() }}</div> }
            </div>
          </div>
          <div class="form-actions" style="margin-top:0;">
            <button type="button" class="btn btn-danger" [disabled]="loyaltySaving()" (click)="adjust('redeem')">
              − Redeem
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="loyaltySaving()">
              + Earn
            </button>
          </div>
        </form>
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
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .form-section:first-child { border-top: 0; padding-top: 0; }
    .address-block { display: flex; flex-direction: column; gap: 0.5rem; }
    .loyalty-balance {
      font-size: 2rem;
      font-weight: 700;
      color: #166534;
      font-family: ui-monospace, monospace;
    }
  `]
})
export class CustomerEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CustomersApi);
  private readonly groupsApi = inject(CustomerGroupsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly loyaltySaving = signal(false);
  protected readonly customer = signal<CustomerDto | null>(null);
  protected readonly customerGroups = signal<CustomerGroupDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    type: [ContactType.Customer, [Validators.required]],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    supplierBusinessName: ['', [Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(256)]],
    taxNumber: ['', [Validators.maxLength(50)]],
    customerGroupId: [''],
    dateOfBirth: [''],
    gender: [''],
    openingBalanceAmount: [0, [Validators.min(0)]],
    openingBalanceCurrency: ['PKR', [Validators.pattern(/^[A-Z]{3}$/)]],
    creditLimitAmount: [null as number | null, [Validators.min(0)]],
    creditLimitCurrency: [''],
    notes: ['', [Validators.maxLength(2000)]],
    billingAddress: this.fb.nonNullable.group({
      line1: [''],
      line2: [''],
      city: [''],
      state: [''],
      country: [''],
      postalCode: ['']
    }),
    shippingAddress: this.fb.nonNullable.group({
      line1: [''],
      line2: [''],
      city: [''],
      state: [''],
      country: [''],
      postalCode: ['']
    })
  });

  protected readonly loyaltyForm = this.fb.nonNullable.group({
    points: [10, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.groupsApi.list().subscribe({
      next: list => this.customerGroups.set(list),
      error: () => {}
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(c => {
        this.customer.set(c);
        this.form.patchValue({
          type: c.type,
          fullName: c.fullName,
          supplierBusinessName: c.supplierBusinessName ?? '',
          phone: c.phone ?? '',
          email: c.email ?? '',
          taxNumber: c.taxNumber ?? '',
          customerGroupId: c.customerGroupId ?? '',
          dateOfBirth: c.dateOfBirth ?? '',
          gender: c.gender == null ? '' : String(c.gender),
          openingBalanceAmount: c.openingBalanceAmount,
          openingBalanceCurrency: c.openingBalanceCurrency,
          creditLimitAmount: c.creditLimitAmount,
          creditLimitCurrency: c.creditLimitCurrency ?? '',
          notes: c.notes ?? '',
          billingAddress: {
            line1: c.billingAddress.line1 ?? '',
            line2: c.billingAddress.line2 ?? '',
            city: c.billingAddress.city ?? '',
            state: c.billingAddress.state ?? '',
            country: c.billingAddress.country ?? '',
            postalCode: c.billingAddress.postalCode ?? ''
          },
          shippingAddress: {
            line1: c.shippingAddress.line1 ?? '',
            line2: c.shippingAddress.line2 ?? '',
            city: c.shippingAddress.city ?? '',
            state: c.shippingAddress.state ?? '',
            country: c.shippingAddress.country ?? '',
            postalCode: c.shippingAddress.postalCode ?? ''
          }
        });
        // Opening balance is set once at creation; lock on edit.
        this.form.controls.openingBalanceAmount.disable();
        this.form.controls.openingBalanceCurrency.disable();
      });
    }
  }

  showSupplierFields(): boolean {
    const t = Number(this.form.controls.type.value);
    return t === ContactType.Supplier || t === ContactType.Both;
  }

  copyBillingToShipping(): void {
    const billing = this.form.controls.billingAddress.getRawValue();
    this.form.controls.shippingAddress.patchValue(billing);
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
    if (c.errors['email']) return 'Invalid email.';
    if (c.errors['maxlength']) return 'Too long.';
    if (c.errors['min']) return 'Must be 0 or greater.';
    if (c.errors['pattern']) return 'Must be a 3-letter currency code.';
    return 'Invalid.';
  }

  loyaltyInvalid(): boolean {
    const c = this.loyaltyForm.controls.points;
    return c.invalid && (c.touched || c.dirty);
  }

  loyaltyErrorOf(): string {
    const c = this.loyaltyForm.controls.points;
    if (!c.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    if (c.errors['min']) return 'Must be at least 1.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const t = Number(raw.type);

    const baseCcy = (raw.openingBalanceCurrency || 'PKR').toUpperCase();
    const billing = this.toAddressOrNull(raw.billingAddress);
    const shipping = this.toAddressOrNull(raw.shippingAddress);

    const body = {
      fullName: raw.fullName.trim(),
      phone: raw.phone?.trim() || null,
      email: raw.email?.trim() || null,
      notes: raw.notes?.trim() || null,
      type: t,
      supplierBusinessName: raw.supplierBusinessName?.trim() || null,
      taxNumber: raw.taxNumber?.trim() || null,
      openingBalanceAmount: this.isEdit() ? undefined : Number(raw.openingBalanceAmount || 0),
      openingBalanceCurrency: this.isEdit() ? undefined : baseCcy,
      creditLimitAmount: raw.creditLimitAmount != null ? Number(raw.creditLimitAmount) : null,
      creditLimitCurrency: raw.creditLimitAmount != null
        ? ((raw.creditLimitCurrency || baseCcy) as string).toUpperCase()
        : null,
      billingAddress: billing,
      shippingAddress: shipping,
      customerGroupId: raw.customerGroupId || null,
      dateOfBirth: raw.dateOfBirth || null,
      gender: raw.gender === '' ? null : Number(raw.gender) as Gender
    };

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, ...body })
      : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Contact updated.' : 'Contact created.');
        this.router.navigate(['/customers']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  private toAddressOrNull(a: { line1: string; line2: string; city: string; state: string; country: string; postalCode: string; }) {
    const trimmed = {
      line1: a.line1?.trim() || null,
      line2: a.line2?.trim() || null,
      city: a.city?.trim() || null,
      state: a.state?.trim() || null,
      country: a.country?.trim() || null,
      postalCode: a.postalCode?.trim() || null
    };
    const allEmpty = Object.values(trimmed).every(v => v === null);
    return allEmpty ? null : trimmed;
  }

  adjust(kind: 'earn' | 'redeem'): void {
    if (this.loyaltyForm.invalid) { this.loyaltyForm.markAllAsTouched(); return; }
    const points = this.loyaltyForm.controls.points.value;
    this.loyaltySaving.set(true);

    const obs = kind === 'earn'
      ? this.api.earnPoints(this.id()!, { points })
      : this.api.redeemPoints(this.id()!, { points });

    obs.subscribe({
      next: c => {
        this.customer.set(c);
        this.notify.success(kind === 'earn'
          ? `+${points} points earned (balance: ${c.totalRewardPoints}).`
          : `${points} points redeemed (balance: ${c.totalRewardPoints}).`);
        this.loyaltySaving.set(false);
      },
      error: err => {
        this.loyaltySaving.set(false);
        this.notify.error(userMessage(err));
      }
    });
  }
}
