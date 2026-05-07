import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UnitGroupsApi } from '../../../core/api/unit-groups.api';
import { UnitsApi } from '../../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { UnitGroupDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-unit-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Unit' : 'New Unit' }}</h1>
        <p class="muted">
          Pick a Group, set a short Code + Name, and the Conversion Factor
          (multiplier to the group's reference scale; the base unit has factor = 1).
        </p>
      </div>
      <a class="btn" routerLink="/catalog/units">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('groupId')">
          <label>Group</label>
          <select formControlName="groupId">
            <option value="">— select —</option>
            @for (g of groups(); track g.id) {
              <option [value]="g.id">{{ g.name }}</option>
            }
          </select>
          @if (invalid('groupId')) { <div class="field-error">{{ errorOf('groupId') }}</div> }
          @if (groups().length === 0) {
            <div class="muted" style="margin-top:0.4rem;">
              No unit groups exist. <a routerLink="/catalog/unit-groups/new">Create one first</a>.
            </div>
          }
        </div>
        <div class="field" [class.invalid]="invalid('conversionFactor')">
          <label>Conversion Factor</label>
          <input type="number" step="any" min="0" formControlName="conversionFactor" />
          <small class="muted">
            e.g. base unit = 1, KG (in Mass with base GM) = 1000, DOZ (in Count with base PCS) = 12.
          </small>
          @if (invalid('conversionFactor')) { <div class="field-error">{{ errorOf('conversionFactor') }}</div> }
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('code')">
          <label>Code</label>
          <input formControlName="code" maxlength="10" style="text-transform:uppercase;" />
          @if (invalid('code')) { <div class="field-error">{{ errorOf('code') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/units">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create unit') }}
        </button>
      </div>
    </form>
  `
})
export class UnitEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UnitsApi);
  private readonly groupsApi = inject(UnitGroupsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly groups = signal<UnitGroupDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    groupId: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Z0-9]+$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    conversionFactor: [1, [Validators.required, Validators.min(0.000001)]]
  });

  constructor() {
    this.groupsApi.list().subscribe(list => this.groups.set(list));

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(u => this.form.patchValue({
        groupId: u.groupId,
        code: u.code,
        name: u.name,
        conversionFactor: u.conversionFactor
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
    if (c.errors['min']) return 'Must be greater than 0.';
    if (c.errors['pattern']) return 'Use uppercase letters and digits only.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      groupId: raw.groupId,
      code: raw.code.toUpperCase(),
      name: raw.name.trim(),
      conversionFactor: Number(raw.conversionFactor)
    };
    const obs = this.isEdit() ? this.api.update({ id: this.id()!, ...body }) : this.api.create(body);

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Unit updated.' : 'Unit created.');
        this.router.navigate(['/catalog/units']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }
}
