import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { FloorPlansApi } from '../../../core/api/floor-plans.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto, FloorPlanDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-floor-plans-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Floor Plans</h1>
        <p class="muted">Visual groupings of tables per branch (Main, Patio, VIP, …).</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="branchFilter" (ngModelChange)="reload()">
          <option value="">All branches</option>
          @for (b of branches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) {
          <a class="btn btn-primary" routerLink="/restaurant/floor-plans/new">+ New Floor Plan</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Name</th>
          <th style="text-align:right;">Order</th>
          <th style="text-align:right;"># Tables</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No floor plans yet.</td></tr>
        } @else {
          @for (p of rows(); track p.id) {
            <tr [class.inactive]="!p.isActive">
              <td>{{ p.branchName }}</td>
              <td>{{ p.name }}</td>
              <td style="text-align:right;">{{ p.displayOrder }}</td>
              <td style="text-align:right;">{{ p.tableCount }}</td>
              <td>
                <span class="badge" [class.badge-active]="p.isActive" [class.badge-inactive]="!p.isActive">
                  {{ p.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/restaurant/floor-plans', p.id]">Edit</a>
                @if ((auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) && p.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(p)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
  `]
})
export class FloorPlansListComponent {
  private readonly api = inject(FloorPlansApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<FloorPlanDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);
  protected branchFilter = '';
  protected includeInactive = false;

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({
      branchId: this.branchFilter || undefined,
      includeInactive: this.includeInactive
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(p: FloorPlanDto): void {
    if (!confirm(`Deactivate floor plan "${p.name}"?`)) return;
    this.api.deactivate(p.id).subscribe({
      next: () => { this.notify.success('Floor plan deactivated.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
