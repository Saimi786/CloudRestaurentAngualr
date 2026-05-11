import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CashRegistersApi } from '../../core/api/cash-registers.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { CashRegisterShiftDto, ShiftMovementType, ShiftStatus } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-shift-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, DatePipe, DecimalPipe],
  template: `
    @if (shift(); as s) {
      <div class="page-header">
        <div>
          <h1>Shift — {{ s.cashRegisterCode }}</h1>
          <p class="muted">
            {{ s.cashRegisterName }} · {{ s.branchName }} · opened by {{ s.openedByUserName }}
            on {{ s.openedAt | date:'medium' }}
          </p>
        </div>
        <a class="btn" routerLink="/cash-registers/shifts">← All shifts</a>
      </div>

      <div class="panel z-report">
        <h2 style="margin-top:0;">Z-report</h2>
        <table class="kv">
          <tbody>
            <tr><td>Opening cash</td><td class="amt">{{ s.openingAmount | number:'1.2-2' }} {{ s.currency }}</td></tr>
            <tr><td>+ Sales (cash)</td><td class="amt">{{ s.saleTotal | number:'1.2-2' }}</td></tr>
            <tr><td>+ Cash drops</td><td class="amt">{{ s.cashInTotal | number:'1.2-2' }}</td></tr>
            <tr><td>− Refunds</td><td class="amt">{{ s.refundTotal | number:'1.2-2' }}</td></tr>
            <tr><td>− Paid-outs</td><td class="amt">{{ s.paidOutTotal | number:'1.2-2' }}</td></tr>
            <tr><td>− Cash pulls</td><td class="amt">{{ s.cashOutTotal | number:'1.2-2' }}</td></tr>
            <tr class="row-total">
              <td>Expected closing</td>
              <td class="amt">
                @if (s.status === ShiftStatus.Closed) {
                  {{ s.expectedClosingAmount | number:'1.2-2' }}
                } @else {
                  {{ runningExpected() | number:'1.2-2' }} <small class="muted">(running)</small>
                }
              </td>
            </tr>
            @if (s.status === ShiftStatus.Closed) {
              <tr><td>Declared closing</td><td class="amt">{{ s.declaredClosingAmount | number:'1.2-2' }}</td></tr>
              <tr [class.over]="(s.overShortAmount ?? 0) > 0" [class.short]="(s.overShortAmount ?? 0) < 0">
                <td><strong>Over / Short</strong></td>
                <td class="amt"><strong>{{ s.overShortAmount | number:'1.2-2' }}</strong></td>
              </tr>
              <tr><td>Closed by</td><td class="amt">{{ s.closedByUserName }} · {{ s.closedAt | date:'medium' }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (s.status === ShiftStatus.Open) {
        <div class="panel">
          <h3>Add manual movement</h3>
          <form [formGroup]="moveForm" (ngSubmit)="addMovement()">
            <div class="form-row">
              <div class="field">
                <label>Type</label>
                <select formControlName="type">
                  <option [value]="ShiftMovementType.CashIn">Cash drop in</option>
                  <option [value]="ShiftMovementType.CashOut">Cash pull out</option>
                  <option [value]="ShiftMovementType.PaidOut">Paid out (expense)</option>
                </select>
              </div>
              <div class="field">
                <label>Amount</label>
                <input type="number" min="0.01" step="0.01" formControlName="amount" />
              </div>
              <div class="field" style="flex:2;">
                <label>Reference / notes</label>
                <input formControlName="notes" placeholder="What is this for?" />
              </div>
              <div class="field" style="align-self:end;">
                <button type="submit" class="btn btn-primary" [disabled]="adding()">
                  {{ adding() ? 'Saving…' : '+ Add' }}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="panel close-shift">
          <h3>Close shift</h3>
          <form [formGroup]="closeForm" (ngSubmit)="close()">
            <div class="form-row">
              <div class="field">
                <label>Declared cash in drawer</label>
                <input type="number" min="0" step="0.01" formControlName="declaredClosingAmount" />
              </div>
              <div class="field" style="flex:2;">
                <label>Notes (optional)</label>
                <input formControlName="notes" />
              </div>
              <div class="field" style="align-self:end;">
                <button type="submit" class="btn btn-danger" [disabled]="closing()">
                  {{ closing() ? 'Closing…' : 'Close shift' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      }

      <div class="panel">
        <h3>Movements</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th style="text-align:right;">Amount</th>
              <th>Reference</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            @if (s.movements.length === 0) {
              <tr><td colspan="5" class="empty">No movements yet.</td></tr>
            } @else {
              @for (m of s.movements; track m.id) {
                <tr>
                  <td>{{ m.createdAt | date:'short' }}</td>
                  <td><span class="badge">{{ m.typeName }}</span></td>
                  <td style="text-align:right;" class="mono"
                      [class.flow-out]="isOutflow(m.type)">
                    {{ isOutflow(m.type) ? '−' : '+' }}{{ m.amount | number:'1.2-2' }}
                  </td>
                  <td class="mono">{{ m.reference || '—' }}</td>
                  <td>{{ m.notes || '—' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="muted">Loading…</p>
    }
  `,
  styles: [`
    .z-report { max-width: 480px; }
    .kv { width: 100%; border-collapse: collapse; }
    .kv td { padding: 0.4rem 0.5rem; }
    .kv td.amt { text-align: right; font-family: ui-monospace, monospace; }
    .kv .row-total td { border-top: 1px solid #d1d5db; padding-top: 0.7rem; font-weight: 600; }
    .kv tr.over td { background: #ecfdf5; color: #047857; }
    .kv tr.short td { background: #fef2f2; color: #b91c1c; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .flow-out { color: #b91c1c; }
    .close-shift { background: #fffbeb; }
  `]
})
export class ShiftDetailComponent {
  private readonly api = inject(CashRegistersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly ShiftStatus = ShiftStatus;
  protected readonly ShiftMovementType = ShiftMovementType;

  protected readonly shift = signal<CashRegisterShiftDto | null>(null);
  protected readonly closing = signal(false);
  protected readonly adding = signal(false);

  protected readonly closeForm = this.fb.nonNullable.group({
    declaredClosingAmount: [0, [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  protected readonly moveForm = this.fb.nonNullable.group({
    type: [ShiftMovementType.CashIn, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    notes: ['']
  });

  protected readonly runningExpected = computed(() => {
    const s = this.shift();
    if (!s) return 0;
    return s.openingAmount + s.saleTotal + s.cashInTotal - s.refundTotal - s.paidOutTotal - s.cashOutTotal;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id: string): void {
    this.api.getShift(id).subscribe({
      next: s => {
        this.shift.set(s);
        this.closeForm.controls.declaredClosingAmount.setValue(
          this.computeRunningExpected(s)
        );
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  computeRunningExpected(s: CashRegisterShiftDto): number {
    return s.openingAmount + s.saleTotal + s.cashInTotal - s.refundTotal - s.paidOutTotal - s.cashOutTotal;
  }

  isOutflow(t: ShiftMovementType): boolean {
    return t === ShiftMovementType.Refund || t === ShiftMovementType.PaidOut || t === ShiftMovementType.CashOut;
  }

  addMovement(): void {
    if (this.moveForm.invalid) { this.moveForm.markAllAsTouched(); return; }
    const s = this.shift(); if (!s) return;
    const raw = this.moveForm.getRawValue();
    this.adding.set(true);
    this.api.addMovement(s.id, {
      type: Number(raw.type) as ShiftMovementType,
      amount: Number(raw.amount),
      reference: null,
      notes: raw.notes || null
    }).subscribe({
      next: () => {
        this.adding.set(false);
        this.moveForm.reset({ type: ShiftMovementType.CashIn, amount: 0, notes: '' });
        this.load(s.id);
      },
      error: err => {
        this.adding.set(false);
        if (!applyServerErrors(this.moveForm, err)) this.notify.error(userMessage(err));
      }
    });
  }

  close(): void {
    if (this.closeForm.invalid) { this.closeForm.markAllAsTouched(); return; }
    const s = this.shift(); if (!s) return;
    if (!confirm(`Close shift for ${s.cashRegisterCode}? This is final.`)) return;

    const raw = this.closeForm.getRawValue();
    this.closing.set(true);
    this.api.closeShift(s.id, {
      declaredClosingAmount: Number(raw.declaredClosingAmount),
      notes: raw.notes || null
    }).subscribe({
      next: closed => {
        this.closing.set(false);
        this.shift.set(closed);
        const overShort = closed.overShortAmount ?? 0;
        if (Math.abs(overShort) < 0.005) this.notify.success('Shift closed — drawer balanced.');
        else if (overShort > 0) this.notify.success(`Shift closed — over by ${overShort.toFixed(2)}.`);
        else this.notify.error(`Shift closed — short by ${Math.abs(overShort).toFixed(2)}.`);
      },
      error: err => {
        this.closing.set(false);
        if (!applyServerErrors(this.closeForm, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
