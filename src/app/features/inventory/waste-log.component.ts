import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchesApi } from '../../core/api/branches.api';
import { ProductsApi } from '../../core/api/products.api';
import { UnitsApi } from '../../core/api/units.api';
import { WasteLogApi } from '../../core/api/waste-log.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, ProductDto, UnitDto, WasteLogDto, WasteReason } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-waste-log',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Waste Log</h1>
        <p class="muted">Stock written off as waste with reason. Posts a Wastage StockMovement automatically.</p>
      </div>
    </div>

    <form class="panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field">
          <label>Branch</label>
          <select formControlName="branchId">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
        </div>
        <div class="field" style="flex:2;">
          <label>Product</label>
          <select formControlName="productId">
            <option value="">— select —</option>
            @for (p of products(); track p.id) {
              <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Unit</label>
          <select formControlName="unitId">
            <option value="">— select —</option>
            @for (u of units(); track u.id) {
              <option [value]="u.id">{{ u.code }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Quantity</label>
          <input type="number" min="0.0001" step="0.0001" formControlName="quantity" />
        </div>
        <div class="field">
          <label>Reason</label>
          <select formControlName="reason">
            <option [value]="WasteReason.Spoilage">Spoilage</option>
            <option [value]="WasteReason.Breakage">Breakage</option>
            <option [value]="WasteReason.Theft">Theft</option>
            <option [value]="WasteReason.PrepError">Prep error</option>
            <option [value]="WasteReason.Other">Other</option>
          </select>
        </div>
        <div class="field" style="flex:2;">
          <label>Notes</label>
          <input formControlName="notes" />
        </div>
        <div class="field" style="align-self:end;">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : '+ Log waste' }}
          </button>
        </div>
      </div>
    </form>

    <table class="data-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Branch</th>
          <th>Product</th>
          <th style="text-align:right;">Qty</th>
          <th>Reason</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No waste logged.</td></tr>
        } @else {
          @for (w of rows(); track w.id) {
            <tr>
              <td>{{ w.occurredAt | date:'short' }}</td>
              <td>{{ w.branchName }}</td>
              <td>
                <span class="mono">{{ w.sku }}</span> {{ w.productName }}
              </td>
              <td style="text-align:right;" class="mono">
                {{ w.quantity | number:'1.0-4' }} {{ w.unitCode }}
              </td>
              <td><span class="badge">{{ w.reasonName }}</span></td>
              <td>{{ w.notes || '—' }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class WasteLogComponent {
  private readonly api = inject(WasteLogApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly WasteReason = WasteReason;
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly products = signal<ProductDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);
  protected readonly rows = signal<WasteLogDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', Validators.required],
    productId: ['', Validators.required],
    unitId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    reason: [WasteReason.Spoilage, Validators.required],
    notes: ['']
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.productsApi.list({}).subscribe(list => this.products.set(list));
    this.unitsApi.list().subscribe(list => this.units.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({ take: 200 }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.api.log({
      branchId: raw.branchId,
      productId: raw.productId,
      unitId: raw.unitId,
      quantity: Number(raw.quantity),
      reason: Number(raw.reason) as WasteReason,
      notes: raw.notes || null,
      occurredAt: null
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Waste logged.');
        this.form.patchValue({ productId: '', unitId: '', quantity: 0, notes: '' });
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
