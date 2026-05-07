import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UnitGroupsApi } from '../../../core/api/unit-groups.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-unit-group-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Unit Group' : 'New Unit Group' }}</h1>
        <p class="muted">Examples: Mass, Volume, Count, Time. After creating the group, add units to it (e.g. KG, GM into Mass) with their conversion factor.</p>
      </div>
      <a class="btn" routerLink="/catalog/unit-groups">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="Mass" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/unit-groups">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create group') }}
        </button>
      </div>
    </form>
  `
})
export class UnitGroupEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UnitGroupsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]]
  });

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(g => this.form.patchValue({ name: g.name }));
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
    const body = { name: this.form.getRawValue().name.trim() };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Unit group updated.' : 'Unit group created.');
        this.router.navigate(['/catalog/unit-groups']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
