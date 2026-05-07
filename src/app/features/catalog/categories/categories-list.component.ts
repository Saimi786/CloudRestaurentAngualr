import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoriesApi } from '../../../core/api/categories.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { CategoryDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Categories</h1>
        <p class="muted">Group your products into menu sections.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/categories/new">+ New Category</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr><th>Order</th><th>Name</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="4" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="4" class="empty">No categories yet.</td></tr>
        } @else {
          @for (c of rows(); track c.id) {
            <tr [class.inactive]="!c.isActive">
              <td>{{ c.displayOrder }}</td>
              <td>{{ c.name }}</td>
              <td>
                <span class="badge" [class.badge-active]="c.isActive" [class.badge-inactive]="!c.isActive">
                  {{ c.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/categories', c.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && c.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(c)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `
})
export class CategoriesListComponent {
  private readonly api = inject(CategoriesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<CategoryDto[]>([]);
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

  deactivate(c: CategoryDto): void {
    if (!confirm(`Deactivate category "${c.name}"?`)) return;
    this.api.deactivate(c.id).subscribe({
      next: () => { this.notify.success(`${c.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
