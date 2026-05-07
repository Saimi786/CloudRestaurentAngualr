import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriesApi } from '../../../core/api/categories.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-category-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Category' : 'New Category' }}</h1>
        <p class="muted">Used to group products on the menu.</p>
      </div>
      <a class="btn" routerLink="/catalog/categories">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('displayOrder')">
          <label>Display Order</label>
          <input type="number" min="0" formControlName="displayOrder" />
          @if (invalid('displayOrder')) { <div class="field-error">{{ errorOf('displayOrder') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/categories">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create category') }}
        </button>
      </div>
    </form>
  `
})
export class CategoryEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CategoriesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(c => this.form.patchValue({
        name: c.name,
        displayOrder: c.displayOrder
      }));
    }
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(field: string): string {
    const c = this.form.get(field);
    if (!c?.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    if (c.errors['maxlength']) return 'Too long.';
    if (c.errors['min']) return 'Must be 0 or greater.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = { name: raw.name.trim(), displayOrder: raw.displayOrder };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Category updated.' : 'Category created.');
        this.router.navigate(['/catalog/categories']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
