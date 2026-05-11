import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrandsApi } from '../../../core/api/brands.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { BrandDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-brands-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Brands</h1>
        <p class="muted">Group products by manufacturer or label.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/brands/new">+ New Brand</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr><th>Name</th><th>Description</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="4" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="4" class="empty">No brands yet.</td></tr>
        } @else {
          @for (b of rows(); track b.id) {
            <tr [class.inactive]="!b.isActive">
              <td>{{ b.name }}</td>
              <td class="muted">{{ b.description || '—' }}</td>
              <td>
                <span class="badge" [class.badge-active]="b.isActive" [class.badge-inactive]="!b.isActive">
                  {{ b.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/brands', b.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && b.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(b)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `
})
export class BrandsListComponent {
  private readonly api = inject(BrandsApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<BrandDto[]>([]);
  protected readonly loading = signal(true);
  protected includeInactive = false;

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.includeInactive).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(b: BrandDto): void {
    if (!confirm(`Deactivate brand "${b.name}"?`)) return;
    this.api.deactivate(b.id).subscribe({
      next: () => { this.notify.success(`${b.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
