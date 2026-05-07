import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoriesApi } from '../../../core/api/categories.api';
import { ProductsApi } from '../../../core/api/products.api';
import { UnitsApi } from '../../../core/api/units.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { CategoryDto, ProductDto, UnitDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Products</h1>
        <p class="muted">Menu items / SKUs in your catalog.</p>
      </div>
      <div class="actions">
        <input class="search" type="search" placeholder="Search name or SKU…"
               [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
        <select [(ngModel)]="categoryFilter" (ngModelChange)="reload()">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/products/new">+ New Product</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th>Category</th>
          <th>Unit</th>
          <th style="text-align:right;">Price</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="7" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="7" class="empty">No products found.</td></tr>
        } @else {
          @for (p of rows(); track p.id) {
            <tr [class.inactive]="!p.isActive">
              <td class="mono">{{ p.sku }}</td>
              <td>{{ p.name }}</td>
              <td>{{ categoryName(p.categoryId) }}</td>
              <td class="mono">{{ unitCode(p.unitId) }}</td>
              <td style="text-align:right;">{{ p.basePriceAmount | number:'1.2-2' }} {{ p.basePriceCurrency }}</td>
              <td>
                <span class="badge" [class.badge-active]="p.isActive" [class.badge-inactive]="!p.isActive">
                  {{ p.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/products', p.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && p.isActive) {
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
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    select, .search {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .search { min-width: 200px; }
  `]
})
export class ProductsListComponent {
  private readonly productsApi = inject(ProductsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<ProductDto[]>([]);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly units = signal<UnitDto[]>([]);
  protected readonly loading = signal(true);
  protected categoryFilter = '';
  protected includeInactive = false;
  protected search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.categoriesApi.list(true).subscribe(list => this.categories.set(list));
    this.unitsApi.list({ includeInactive: true }).subscribe(list => this.units.set(list));
    this.reload();
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }

  reload(): void {
    this.loading.set(true);
    this.productsApi.list({
      categoryId: this.categoryFilter || undefined,
      search: this.search || undefined,
      includeInactive: this.includeInactive
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  categoryName(id: string): string {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  unitCode(id: string): string {
    return this.units().find(u => u.id === id)?.code ?? '—';
  }

  deactivate(p: ProductDto): void {
    if (!confirm(`Deactivate product "${p.name}"?`)) return;
    this.productsApi.deactivate(p.id).subscribe({
      next: () => { this.notify.success(`${p.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
