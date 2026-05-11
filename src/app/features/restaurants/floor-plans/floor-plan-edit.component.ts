import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { FloorPlansApi } from '../../../core/api/floor-plans.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-floor-plan-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Floor Plan' : 'New Floor Plan' }}</h1>
        <p class="muted">A named grouping of tables within one branch.</p>
      </div>
      <a class="btn" routerLink="/restaurant/floor-plans">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('branchId')">
          <label>Branch</label>
          <select formControlName="branchId">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
          @if (isEdit()) { <small class="muted">Branch can't be changed once a floor plan is created.</small> }
          @if (invalid('branchId')) { <div class="field-error">{{ errorOf('branchId') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="Main Floor" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('displayOrder')">
          <label>Display Order</label>
          <input type="number" min="0" formControlName="displayOrder" />
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/restaurant/floor-plans">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create floor plan') }}
        </button>
      </div>
    </form>
  `
})
export class FloorPlanEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FloorPlansApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly branches = signal<BranchDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.form.controls.branchId.disable();
      this.api.get(routeId).subscribe(p => this.form.patchValue({
        branchId: p.branchId,
        name: p.name,
        displayOrder: p.displayOrder
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

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, name: raw.name.trim(), displayOrder: Number(raw.displayOrder) })
      : this.api.create({
          branchId: raw.branchId,
          name: raw.name.trim(),
          displayOrder: Number(raw.displayOrder)
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Floor plan updated.' : 'Floor plan created.');
        this.router.navigate(['/restaurant/floor-plans']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
