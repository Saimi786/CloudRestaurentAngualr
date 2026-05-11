import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { KitchenStationsApi } from '../../../core/api/kitchen-stations.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-kitchen-station-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Station' : 'New Kitchen Station' }}</h1>
        <p class="muted">Categories link to a station — products in those categories appear on this station's KDS.</p>
      </div>
      <a class="btn" routerLink="/restaurant/kitchen-stations">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('branchId')">
          <label>Branch</label>
          <select formControlName="branchId" [attr.disabled]="isEdit() ? '' : null">
            <option value="">— select —</option>
            @for (b of branches(); track b.id) {
              <option [value]="b.id">{{ b.name }}</option>
            }
          </select>
          @if (invalid('branchId')) { <div class="field-error">{{ errorOf('branchId') }}</div> }
          @if (isEdit()) { <small class="muted">Branch is fixed once a station is created.</small> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="e.g. Grill" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('displayOrder')">
          <label>Display Order</label>
          <input type="number" min="0" formControlName="displayOrder" />
        </div>
      </div>

      <div class="field" [class.invalid]="invalid('description')">
        <label>Description</label>
        <textarea rows="2" formControlName="description"></textarea>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/restaurant/kitchen-stations">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create station') }}
        </button>
      </div>
    </form>
  `
})
export class KitchenStationEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(KitchenStationsApi);
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
    name: ['', [Validators.required, Validators.maxLength(100)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.maxLength(500)]]
  });

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(s => {
        this.form.patchValue({
          branchId: s.branchId,
          name: s.name,
          displayOrder: s.displayOrder,
          description: s.description ?? ''
        });
        this.form.controls.branchId.disable();
      });
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
    const description = raw.description.trim() || null;

    const obs = this.isEdit()
      ? this.api.update({ id: this.id()!, name: raw.name.trim(), displayOrder: raw.displayOrder, description })
      : this.api.create({ branchId: raw.branchId, name: raw.name.trim(), displayOrder: raw.displayOrder, description });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Station updated.' : 'Station created.');
        this.router.navigate(['/restaurant/kitchen-stations']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
