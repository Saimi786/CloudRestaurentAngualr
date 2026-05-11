import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { CashRegistersApi } from '../../core/api/cash-registers.api';
import { AuthService } from '../../core/auth/auth.service';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, CashRegisterDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-cash-registers-list',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Cash Registers</h1>
        <p class="muted">Tills with their open shift status. One open shift per register at a time.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
      </div>
    </div>

    @if (auth.hasRole('TenantAdmin')) {
      <form class="panel" [formGroup]="newForm" (ngSubmit)="create()">
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
            <label>Code</label>
            <input formControlName="code" placeholder="POS-1" />
          </div>
          <div class="field" style="flex: 2;">
            <label>Name</label>
            <input formControlName="name" placeholder="Front counter" />
          </div>
          <div class="field" style="align-self:end;">
            <button type="submit" class="btn btn-primary" [disabled]="creating()">
              {{ creating() ? 'Adding…' : '+ Add Register' }}
            </button>
          </div>
        </div>
      </form>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Code</th>
          <th>Name</th>
          <th>Shift</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No registers yet.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr [class.inactive]="!r.isActive">
              <td>{{ r.branchName }}</td>
              <td class="mono">{{ r.code }}</td>
              <td>{{ r.name }}</td>
              <td>
                @if (r.activeShiftId) {
                  <a [routerLink]="['/cash-registers/shifts', r.activeShiftId]" class="badge badge-active">Open</a>
                } @else {
                  <span class="muted">Closed</span>
                }
              </td>
              <td>
                <span class="badge" [class.badge-active]="r.isActive" [class.badge-inactive]="!r.isActive">
                  {{ r.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                @if (r.isActive && !r.activeShiftId) {
                  <button class="btn btn-sm btn-primary" (click)="openShift(r)">Open shift</button>
                }
                @if (auth.hasRole('TenantAdmin') && r.isActive && !r.activeShiftId) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(r)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>

    <div style="margin-top:1.5rem;">
      <a class="btn" routerLink="/cash-registers/shifts">View all shifts →</a>
    </div>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class CashRegistersListComponent {
  private readonly api = inject(CashRegistersApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<CashRegisterDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected includeInactive = false;

  protected readonly newForm = this.fb.nonNullable.group({
    branchId: ['', Validators.required],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(120)]]
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list(undefined, this.includeInactive).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  create(): void {
    if (this.newForm.invalid) { this.newForm.markAllAsTouched(); return; }
    this.creating.set(true);
    this.api.create(this.newForm.getRawValue()).subscribe({
      next: () => { this.creating.set(false); this.newForm.reset(); this.reload(); },
      error: err => {
        this.creating.set(false);
        if (!applyServerErrors(this.newForm, err)) this.notify.error(userMessage(err));
      }
    });
  }

  openShift(r: CashRegisterDto): void {
    const raw = prompt(`Opening cash for ${r.code}? (e.g. 5000)`);
    if (raw === null) return;
    const opening = Number(raw);
    if (!isFinite(opening) || opening < 0) { this.notify.error('Invalid amount.'); return; }
    this.api.openShift({ cashRegisterId: r.id, openingAmount: opening, currency: 'PKR' }).subscribe({
      next: shift => {
        this.notify.success('Shift opened.');
        this.router.navigate(['/cash-registers/shifts', shift.id]);
      },
      error: err => this.notify.error(userMessage(err))
    });
  }

  deactivate(r: CashRegisterDto): void {
    if (!confirm(`Deactivate register "${r.code}"?`)) return;
    this.api.deactivate(r.id).subscribe({
      next: () => { this.notify.success('Deactivated.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
