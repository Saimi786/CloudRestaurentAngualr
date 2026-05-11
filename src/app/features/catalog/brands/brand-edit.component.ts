import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandsApi } from '../../../core/api/brands.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-brand-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Brand' : 'New Brand' }}</h1>
        <p class="muted">Linked from products to drive search filters and reporting.</p>
      </div>
      <a class="btn" routerLink="/catalog/brands">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="field" [class.invalid]="invalid('name')">
        <label>Name</label>
        <input formControlName="name" />
        @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
      </div>

      <div class="field" [class.invalid]="invalid('description')">
        <label>Description</label>
        <textarea rows="3" formControlName="description"></textarea>
        @if (invalid('description')) { <div class="field-error">{{ errorOf('description') }}</div> }
      </div>

      <div class="field" [class.invalid]="invalid('imageUrl')">
        <label>Image URL</label>
        <input formControlName="imageUrl" placeholder="https://…" />
        @if (invalid('imageUrl')) { <div class="field-error">{{ errorOf('imageUrl') }}</div> }
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/brands">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create brand') }}
        </button>
      </div>
    </form>
  `
})
export class BrandEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BrandsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    imageUrl: ['', [Validators.maxLength(500)]]
  });

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(b => this.form.patchValue({
        name: b.name,
        description: b.description ?? '',
        imageUrl: b.imageUrl ?? ''
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
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      imageUrl: raw.imageUrl.trim() || null
    };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Brand updated.' : 'Brand created.');
        this.router.navigate(['/catalog/brands']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
