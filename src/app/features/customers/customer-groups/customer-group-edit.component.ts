import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerGroupsApi } from '../../../core/api/customer-groups.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-customer-group-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Group' : 'New Customer Group' }}</h1>
        <p class="muted">Apply a default discount to customers in this tier.</p>
      </div>
      <a class="btn" routerLink="/customer-groups">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="e.g. Gold" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('discountPercent')">
          <label>Discount %</label>
          <input type="number" step="0.01" min="0" max="100" formControlName="discountPercent" />
          @if (invalid('discountPercent')) { <div class="field-error">{{ errorOf('discountPercent') }}</div> }
        </div>
      </div>

      <div class="field" [class.invalid]="invalid('description')">
        <label>Description</label>
        <textarea rows="3" formControlName="description"></textarea>
        @if (invalid('description')) { <div class="field-error">{{ errorOf('description') }}</div> }
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/customer-groups">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create group') }}
        </button>
      </div>
    </form>
  `
})
export class CustomerGroupEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CustomerGroupsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    discountPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    description: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(g => this.form.patchValue({
        name: g.name,
        discountPercent: g.discountPercent,
        description: g.description ?? ''
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
    if (c.errors['max']) return 'Must be 100 or less.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      discountPercent: raw.discountPercent,
      description: raw.description.trim() || null
    };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Group updated.' : 'Group created.');
        this.router.navigate(['/customer-groups']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
