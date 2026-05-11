import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductsApi } from '../../../core/api/products.api';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { ProductDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-eighty-six-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>86 List</h1>
        <p class="muted">Toggle products on/off the menu without leaving the floor. Off = "86'd" — won't show in POS.</p>
      </div>
      <div class="actions">
        <input type="search" placeholder="Search…" [(ngModel)]="search" />
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th style="text-align:center;">Available</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="3" class="empty">Loading…</td></tr>
        } @else if (filtered().length === 0) {
          <tr><td colspan="3" class="empty">No products match.</td></tr>
        } @else {
          @for (p of filtered(); track p.id) {
            <tr [class.unavailable]="!p.isAvailable">
              <td class="mono">{{ p.sku }}</td>
              <td>{{ p.name }}</td>
              <td style="text-align:center;">
                <label class="toggle">
                  <input type="checkbox" [checked]="p.isAvailable" (change)="toggle(p, $any($event.target).checked)" />
                  <span>{{ p.isAvailable ? 'On menu' : '86\\'d' }}</span>
                </label>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .unavailable td { background: #fef2f2; color: #7f1d1d; }
    .toggle { display: inline-flex; gap: 0.5rem; align-items: center; cursor: pointer; }
    .toggle input { transform: scale(1.4); }
  `]
})
export class EightySixListComponent {
  private readonly api = inject(ProductsApi);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<ProductDto[]>([]);
  protected readonly loading = signal(true);
  protected search = '';

  protected readonly filtered = computed(() => {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter(p =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  });

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list({}).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  toggle(p: ProductDto, available: boolean): void {
    this.api.setAvailability(p.id, available).subscribe({
      next: () => {
        this.rows.update(list => list.map(x => x.id === p.id ? { ...x, isAvailable: available } : x));
        this.notify.success(available ? `${p.name} back on menu.` : `${p.name} 86'd.`);
      },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
