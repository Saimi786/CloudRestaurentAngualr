import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnitGroupsApi } from '../../../core/api/unit-groups.api';
import { UnitsApi } from '../../../core/api/units.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { UnitDto, UnitGroupDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Units</h1>
        <p class="muted">
          Units of measure. Each unit belongs to a Group; conversions only work within the same group.
          Factor is "how many of the group's reference scale this unit equals" (e.g. KG = 1000 GM, base GM = 1).
        </p>
      </div>
      <div class="actions">
        <select [(ngModel)]="groupFilter" (ngModelChange)="reload()">
          <option value="">All groups</option>
          @for (g of groups(); track g.id) {
            <option [value]="g.id">{{ g.name }}</option>
          }
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/units/new">+ New Unit</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Group</th>
          <th>Code</th>
          <th>Name</th>
          <th style="text-align:right;">Factor</th>
          <th>Base?</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="7" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="7" class="empty">No units yet.</td></tr>
        } @else {
          @for (u of rows(); track u.id) {
            <tr [class.inactive]="!u.isActive">
              <td>{{ u.groupName }}</td>
              <td class="mono">{{ u.code }}</td>
              <td>{{ u.name }}</td>
              <td class="mono" style="text-align:right;">{{ u.conversionFactor | number:'1.0-6' }}</td>
              <td>
                @if (u.isBase) {
                  <span class="badge badge-active">base</span>
                }
              </td>
              <td>
                <span class="badge" [class.badge-active]="u.isActive" [class.badge-inactive]="!u.isActive">
                  {{ u.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/units', u.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && u.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(u)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
  `]
})
export class UnitsListComponent {
  private readonly api = inject(UnitsApi);
  private readonly groupsApi = inject(UnitGroupsApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<UnitDto[]>([]);
  protected readonly groups = signal<UnitGroupDto[]>([]);
  protected readonly loading = signal(true);
  protected groupFilter = '';
  protected includeInactive = false;

  constructor() {
    this.groupsApi.list(true).subscribe(list => this.groups.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({
      groupId: this.groupFilter || undefined,
      includeInactive: this.includeInactive
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(u: UnitDto): void {
    if (!confirm(`Deactivate unit "${u.code}"?`)) return;
    this.api.deactivate(u.id).subscribe({
      next: () => { this.notify.success(`${u.code} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
