import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FloorPlansApi } from '../../../core/api/floor-plans.api';
import { TablesApi } from '../../../core/api/tables.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { FloorPlanDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-table-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Table' : 'New Table' }}</h1>
        <p class="muted">Code is unique within a branch (across floor plans).</p>
      </div>
      <a class="btn" routerLink="/restaurant/tables">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('floorPlanId')">
          <label>Floor Plan</label>
          <select formControlName="floorPlanId">
            <option value="">— select —</option>
            @for (p of floorPlans(); track p.id) {
              <option [value]="p.id">{{ p.branchName }} — {{ p.name }}</option>
            }
          </select>
          @if (invalid('floorPlanId')) { <div class="field-error">{{ errorOf('floorPlanId') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('code')">
          <label>Code</label>
          <input formControlName="code" placeholder="T-12" />
          @if (invalid('code')) { <div class="field-error">{{ errorOf('code') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('capacity')">
          <label>Capacity (seats)</label>
          <input type="number" min="1" formControlName="capacity" />
          @if (invalid('capacity')) { <div class="field-error">{{ errorOf('capacity') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/restaurant/tables">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create table') }}
        </button>
      </div>
    </form>
  `
})
export class TableEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TablesApi);
  private readonly floorPlansApi = inject(FloorPlansApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly floorPlans = signal<FloorPlanDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    floorPlanId: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    capacity: [4, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.floorPlansApi.list().subscribe(list => this.floorPlans.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(t => this.form.patchValue({
        floorPlanId: t.floorPlanId,
        code: t.code,
        capacity: t.capacity
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
    if (c.errors['min']) return 'Must be ≥ 1.';
    if (c.errors['maxlength']) return 'Too long.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, floorPlanId: raw.floorPlanId, code: raw.code.trim(), capacity: Number(raw.capacity) })
      : this.api.create({ floorPlanId: raw.floorPlanId, code: raw.code.trim(), capacity: Number(raw.capacity) });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Table updated.' : 'Table created.');
        this.router.navigate(['/restaurant/tables']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
