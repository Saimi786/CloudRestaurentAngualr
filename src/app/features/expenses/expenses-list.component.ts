import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountClass, AccountDto, AccountingApi } from '../../core/api/accounting.api';
import { BranchesApi } from '../../core/api/branches.api';
import { ExpensesApi } from '../../core/api/expenses.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, ExpenseDto, PaymentMethod } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Expenses</h1>
        <p class="muted">Operating expenses paid out of cash/bank. Posts to GL and (if cash) to your open shift.</p>
      </div>
    </div>

    <form class="panel" [formGroup]="form" (ngSubmit)="create()">
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
        <div class="field">
          <label>Expense account</label>
          <select formControlName="expenseAccountId">
            <option value="">— select —</option>
            @for (a of expenseAccounts(); track a.id) {
              <option [value]="a.id">{{ a.code }} — {{ a.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Reference</label>
          <input formControlName="reference" placeholder="Receipt #" />
        </div>
        <div class="field">
          <label>Amount</label>
          <input type="number" min="0.01" step="0.01" formControlName="amount" />
        </div>
        <div class="field">
          <label>Method</label>
          <select formControlName="method">
            <option [value]="PaymentMethod.Cash">Cash</option>
            <option [value]="PaymentMethod.Card">Card</option>
            <option [value]="PaymentMethod.BankTransfer">Bank</option>
            <option [value]="PaymentMethod.Wallet">Wallet</option>
          </select>
        </div>
        <div class="field" style="flex:2;">
          <label>Description</label>
          <input formControlName="description" />
        </div>
        <div class="field" style="align-self:end;">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : '+ Add Expense' }}
          </button>
        </div>
      </div>
    </form>

    <table class="data-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Branch</th>
          <th>Account</th>
          <th>Reference</th>
          <th>Description</th>
          <th>Method</th>
          <th>By</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="8" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="8" class="empty">No expenses yet.</td></tr>
        } @else {
          @for (e of rows(); track e.id) {
            <tr>
              <td>{{ e.occurredAt | date:'short' }}</td>
              <td>{{ e.branchName }}</td>
              <td><span class="mono">{{ e.expenseAccountCode }}</span> {{ e.expenseAccountName }}</td>
              <td class="mono">{{ e.reference }}</td>
              <td>{{ e.description || '—' }}</td>
              <td><span class="badge">{{ e.methodName }}</span></td>
              <td>{{ e.createdByUserName }}</td>
              <td style="text-align:right;" class="mono">{{ e.amount | number:'1.2-2' }} {{ e.currency }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class ExpensesListComponent {
  private readonly api = inject(ExpensesApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly accountsApi = inject(AccountingApi);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly PaymentMethod = PaymentMethod;
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly accounts = signal<AccountDto[]>([]);
  protected readonly rows = signal<ExpenseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly expenseAccounts = computed(() =>
    this.accounts().filter(a => a.class === AccountClass.Expense));

  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', Validators.required],
    expenseAccountId: ['', Validators.required],
    reference: ['', [Validators.required, Validators.maxLength(60)]],
    description: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: [PaymentMethod.Cash, Validators.required]
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.accountsApi.accounts().subscribe(list => this.accounts.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({ take: 200 }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.api.create({
      branchId: raw.branchId,
      expenseAccountId: raw.expenseAccountId,
      reference: raw.reference.trim(),
      description: raw.description || null,
      amount: Number(raw.amount),
      currency: 'PKR',
      method: Number(raw.method) as PaymentMethod,
      occurredAt: null
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Expense recorded.');
        this.form.reset({
          branchId: raw.branchId, expenseAccountId: '', reference: '', description: '',
          amount: 0, method: PaymentMethod.Cash
        });
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
