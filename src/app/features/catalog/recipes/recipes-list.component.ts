import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecipesApi } from '../../../core/api/recipes.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { RecipeSummaryDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-recipes-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Recipes</h1>
        <p class="muted">
          A recipe links a menu Product to its ingredients. When the menu item is sold (POS — coming soon),
          ingredient stock auto-deducts using unit conversions.
        </p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/recipes/new">+ New Recipe</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Menu Product</th>
          <th style="text-align:right;"># Ingredients</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="5" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="5" class="empty">No recipes yet. Add one to start auto-deducting stock when items sell.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr [class.inactive]="!r.isActive">
              <td class="mono">{{ r.productSku }}</td>
              <td>{{ r.productName }}</td>
              <td style="text-align:right;">{{ r.ingredientCount }}</td>
              <td>
                <span class="badge" [class.badge-active]="r.isActive" [class.badge-inactive]="!r.isActive">
                  {{ r.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/recipes', r.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && r.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(r)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class RecipesListComponent {
  private readonly api = inject(RecipesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<RecipeSummaryDto[]>([]);
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

  deactivate(r: RecipeSummaryDto): void {
    if (!confirm(`Deactivate recipe for "${r.productName}"?`)) return;
    this.api.deactivate(r.id).subscribe({
      next: () => { this.notify.success('Recipe deactivated.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
