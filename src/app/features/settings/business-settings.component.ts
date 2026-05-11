import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsApi } from '../../core/api/settings.api';
import { TaxRatesApi } from '../../core/api/tax-rates.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BusinessSettingsDto, TaxRateDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

type Tab = 'general' | 'tax' | 'rewards' | 'prefixes' | 'pos';

@Component({
  selector: 'app-business-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Business Settings</h1>
        <p class="muted">Tenant-wide configuration. Changes apply to every branch and every user.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving() || form.pristine">
          {{ saving() ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading…</div>
    } @else {
      <nav class="tabs">
        @for (t of tabs; track t.key) {
          <button class="tab" [class.active]="activeTab() === t.key" (click)="activeTab.set(t.key)">
            {{ t.label }}
          </button>
        }
      </nav>

      <form [formGroup]="form" (ngSubmit)="save()" class="panel">
        @switch (activeTab()) {
          @case ('general') {
            <h3>General</h3>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('defaultCurrency')">
                <label>Default currency</label>
                <input formControlName="defaultCurrency" maxlength="3" placeholder="PKR" style="text-transform:uppercase;" />
                <small class="muted">3-letter ISO code, e.g. PKR, USD, AED.</small>
              </div>
              <div class="field" [class.invalid]="invalid('defaultTimezone')">
                <label>Timezone (IANA)</label>
                <input formControlName="defaultTimezone" placeholder="Asia/Karachi" />
                <small class="muted">e.g. Asia/Karachi, Asia/Dubai, UTC.</small>
              </div>
            </div>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('fiscalYearStartMonth')">
                <label>Fiscal year — start month</label>
                <input type="number" min="1" max="12" formControlName="fiscalYearStartMonth" />
              </div>
              <div class="field" [class.invalid]="invalid('fiscalYearStartDay')">
                <label>Fiscal year — start day</label>
                <input type="number" min="1" max="31" formControlName="fiscalYearStartDay" />
              </div>
            </div>
          }

          @case ('tax') {
            <h3>Tax</h3>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('taxLabel')">
                <label>Tax label</label>
                <input formControlName="taxLabel" placeholder="Tax" />
                <small class="muted">Shown on receipts and invoices — e.g. "Tax", "VAT", "GST".</small>
              </div>
              <div class="field">
                <label>Default tax rate</label>
                <select formControlName="defaultTaxRateId">
                  <option [ngValue]="null">— None —</option>
                  @for (r of taxRates(); track r.id) {
                    <option [ngValue]="r.id">{{ r.name }} ({{ r.percentage }}%)</option>
                  }
                </select>
                <small class="muted">Applied to taxable products that have no explicit rate.</small>
              </div>
            </div>
          }

          @case ('rewards') {
            <h3>Reward points</h3>
            <div class="form-row">
              <div class="field">
                <label class="toggle">
                  <input type="checkbox" formControlName="rewardPointsEnabled" />
                  <span>Enable reward points</span>
                </label>
              </div>
              <div class="field">
                <label>Display name on receipts</label>
                <input formControlName="rewardPointsName" placeholder="Points" />
              </div>
            </div>

            <div class="fieldset-title">Earning rules</div>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('rewardPointsAmountPerPoint')">
                <label>Currency per 1 point</label>
                <input type="number" min="0.01" step="0.01" formControlName="rewardPointsAmountPerPoint" />
                <small>e.g. 100 = customer earns 1 point per 100 PKR spent.</small>
              </div>
              <div class="field">
                <label>Minimum order to earn points</label>
                <input type="number" min="0" step="0.01" formControlName="rewardPointsMinOrderForEarn" />
                <small>Orders below this don't earn anything.</small>
              </div>
              <div class="field">
                <label>Max points per order</label>
                <input type="number" min="0" formControlName="rewardPointsMaxPerOrder" placeholder="unlimited" />
                <small>Cap on points earned from a single sale.</small>
              </div>
            </div>

            <div class="fieldset-title">Redemption rules</div>
            <div class="form-row">
              <div class="field">
                <label>Currency value per point</label>
                <input type="number" min="0" step="0.0001" formControlName="rewardPointsRedeemValue" />
                <small>e.g. 0.5 = each point worth 0.50 PKR at redemption.</small>
              </div>
              <div class="field">
                <label>Minimum order to redeem</label>
                <input type="number" min="0" step="0.01" formControlName="rewardPointsMinOrderForRedeem" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Minimum points to redeem</label>
                <input type="number" min="0" formControlName="rewardPointsMinRedeem" placeholder="no minimum" />
              </div>
              <div class="field">
                <label>Maximum points per redemption</label>
                <input type="number" min="0" formControlName="rewardPointsMaxRedeem" placeholder="unlimited" />
              </div>
            </div>

            <div class="fieldset-title">Expiry</div>
            <div class="form-row">
              <div class="field">
                <label>Expiry period</label>
                <input type="number" min="0" formControlName="rewardPointsExpiryPeriod" placeholder="never expires" />
              </div>
              <div class="field">
                <label>Period unit</label>
                <select formControlName="rewardPointsExpiryUnit">
                  <option [ngValue]="0">Days</option>
                  <option [ngValue]="1">Months</option>
                  <option [ngValue]="2">Years</option>
                </select>
                <small>A daily background job moves stale points into "expired".</small>
              </div>
            </div>
          }

          @case ('prefixes') {
            <h3>Reference number prefixes</h3>
            <p class="muted">Prefix prepended to auto-generated sequence numbers. e.g. "SAL" produces "SAL-00001".</p>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('salesPrefix')">
                <label>Sales / orders</label>
                <input formControlName="salesPrefix" maxlength="8" style="text-transform:uppercase;" />
              </div>
              <div class="field" [class.invalid]="invalid('purchasePrefix')">
                <label>Purchase orders</label>
                <input formControlName="purchasePrefix" maxlength="8" style="text-transform:uppercase;" />
              </div>
            </div>
            <div class="form-row">
              <div class="field" [class.invalid]="invalid('expensePrefix')">
                <label>Expenses</label>
                <input formControlName="expensePrefix" maxlength="8" style="text-transform:uppercase;" />
              </div>
              <div class="field" [class.invalid]="invalid('customerPrefix')">
                <label>Customers</label>
                <input formControlName="customerPrefix" maxlength="8" style="text-transform:uppercase;" />
              </div>
            </div>
          }

          @case ('pos') {
            <h3>POS behavior</h3>
            <div class="form-row">
              <div class="field">
                <label class="toggle">
                  <input type="checkbox" formControlName="posShowStockLevel" />
                  <span>Show stock level on POS product tiles</span>
                </label>
                <small class="muted">When off, cashiers see only the price.</small>
              </div>
            </div>
          }
        }
      </form>
    }
  `,
  styles: [`
    .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
    .tab {
      background: none; border: none; padding: 0.5rem 1rem; cursor: pointer;
      color: #6b7280; border-bottom: 2px solid transparent; font-weight: 500;
    }
    .tab:hover { color: #1f2937; }
    .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
    h3 { margin: 0 0 1rem; font-size: 1.05rem; }
    .toggle { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class BusinessSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SettingsApi);
  private readonly taxApi = inject(TaxRatesApi);
  private readonly notify = inject(NotificationService);

  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'tax', label: 'Tax' },
    { key: 'rewards', label: 'Reward Points' },
    { key: 'prefixes', label: 'Prefixes' },
    { key: 'pos', label: 'POS' }
  ];

  protected readonly activeTab = signal<Tab>('general');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly taxRates = signal<TaxRateDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    defaultCurrency: ['PKR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    defaultTimezone: ['Asia/Karachi', [Validators.required, Validators.maxLength(64)]],
    fiscalYearStartMonth: [7, [Validators.required, Validators.min(1), Validators.max(12)]],
    fiscalYearStartDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    taxLabel: ['Tax', [Validators.required, Validators.maxLength(32)]],
    defaultTaxRateId: this.fb.control<string | null>(null),
    rewardPointsEnabled: [false],
    rewardPointsName: ['Points', [Validators.required, Validators.maxLength(32)]],
    rewardPointsAmountPerPoint: [100, [Validators.required, Validators.min(0.01)]],
    rewardPointsMinOrderForEarn: [0, [Validators.min(0)]],
    rewardPointsMaxPerOrder: this.fb.control<number | null>(null),
    rewardPointsRedeemValue: [0.01, [Validators.min(0)]],
    rewardPointsMinOrderForRedeem: [0, [Validators.min(0)]],
    rewardPointsMinRedeem: this.fb.control<number | null>(null),
    rewardPointsMaxRedeem: this.fb.control<number | null>(null),
    rewardPointsExpiryPeriod: this.fb.control<number | null>(null),
    rewardPointsExpiryUnit: [2],
    salesPrefix: ['SAL', [Validators.required, Validators.maxLength(8)]],
    purchasePrefix: ['PO', [Validators.required, Validators.maxLength(8)]],
    expensePrefix: ['EXP', [Validators.required, Validators.maxLength(8)]],
    customerPrefix: ['CUS', [Validators.required, Validators.maxLength(8)]],
    posShowStockLevel: [true]
  });

  constructor() {
    this.taxApi.list(true).subscribe({
      next: list => this.taxRates.set(list),
      error: err => this.notify.error(userMessage(err))
    });
    this.api.getBusiness().subscribe({
      next: s => { this.patchFromDto(s); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Some fields are invalid — check each tab.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api.updateBusiness({
      ...raw,
      defaultCurrency: raw.defaultCurrency.toUpperCase(),
      salesPrefix: raw.salesPrefix.toUpperCase(),
      purchasePrefix: raw.purchasePrefix.toUpperCase(),
      expensePrefix: raw.expensePrefix.toUpperCase(),
      customerPrefix: raw.customerPrefix.toUpperCase()
    }).subscribe({
      next: s => {
        this.patchFromDto(s);
        this.saving.set(false);
        this.notify.success('Settings saved.');
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  private patchFromDto(s: BusinessSettingsDto): void {
    this.form.reset({
      defaultCurrency: s.defaultCurrency,
      defaultTimezone: s.defaultTimezone,
      fiscalYearStartMonth: s.fiscalYearStartMonth,
      fiscalYearStartDay: s.fiscalYearStartDay,
      taxLabel: s.taxLabel,
      defaultTaxRateId: s.defaultTaxRateId,
      rewardPointsEnabled: s.rewardPointsEnabled,
      rewardPointsName: s.rewardPointsName,
      rewardPointsAmountPerPoint: s.rewardPointsAmountPerPoint,
      rewardPointsMinOrderForEarn: s.rewardPointsMinOrderForEarn,
      rewardPointsMaxPerOrder: s.rewardPointsMaxPerOrder,
      rewardPointsRedeemValue: s.rewardPointsRedeemValue,
      rewardPointsMinOrderForRedeem: s.rewardPointsMinOrderForRedeem,
      rewardPointsMinRedeem: s.rewardPointsMinRedeem,
      rewardPointsMaxRedeem: s.rewardPointsMaxRedeem,
      rewardPointsExpiryPeriod: s.rewardPointsExpiryPeriod,
      rewardPointsExpiryUnit: s.rewardPointsExpiryUnit,
      salesPrefix: s.salesPrefix,
      purchasePrefix: s.purchasePrefix,
      expensePrefix: s.expensePrefix,
      customerPrefix: s.customerPrefix,
      posShowStockLevel: s.posShowStockLevel
    });
  }
}
