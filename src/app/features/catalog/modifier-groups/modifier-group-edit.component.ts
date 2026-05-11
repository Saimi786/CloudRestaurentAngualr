import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModifierGroupsApi } from '../../../core/api/modifier-groups.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { ModifierInput } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-modifier-group-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Modifier Group' : 'New Modifier Group' }}</h1>
        <p class="muted">
          A group bundles related options. Pick selection rules: <em>required</em> means the customer
          must pick at least the minimum; <em>maxSelect</em> = 1 is single-select, ≥2 is multi-select.
        </p>
      </div>
      <a class="btn" routerLink="/catalog/modifier-groups">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('name')">
          <label>Name</label>
          <input formControlName="name" placeholder="Cheese options" />
          @if (invalid('name')) { <div class="field-error">{{ errorOf('name') }}</div> }
        </div>
        <div class="field">
          <label class="toggle">
            <input type="checkbox" formControlName="isRequired" />
            <span>Required (customer must pick at least Min)</span>
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="field" [class.invalid]="invalid('minSelect')">
          <label>Min select</label>
          <input type="number" min="0" formControlName="minSelect" />
          @if (invalid('minSelect')) { <div class="field-error">{{ errorOf('minSelect') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('maxSelect')">
          <label>Max select</label>
          <input type="number" min="1" formControlName="maxSelect" />
          @if (invalid('maxSelect')) { <div class="field-error">{{ errorOf('maxSelect') }}</div> }
        </div>
      </div>

      <div class="fieldset-title">
        Modifiers
        <button type="button" class="btn btn-sm" style="margin-left:1rem;" (click)="addRow()">
          + Add modifier
        </button>
      </div>

      @if (form.controls.modifiers.errors?.['required']) {
        <div class="field-error">A modifier group must have at least one modifier.</div>
      }

      <div formArrayName="modifiers">
        @for (row of modifierRows; track $index; let i = $index) {
          <div [formGroupName]="i" class="modifier-row">
            <div class="field" [class.invalid]="rowFieldInvalid(i, 'name')">
              <label>Name</label>
              <input formControlName="name" placeholder="Cheddar" />
            </div>
            <div class="field" [class.invalid]="rowFieldInvalid(i, 'priceAdjustmentAmount')">
              <label>Price +/−</label>
              <input type="number" step="any" formControlName="priceAdjustmentAmount" />
            </div>
            <div class="field" [class.invalid]="rowFieldInvalid(i, 'priceAdjustmentCurrency')">
              <label>Currency</label>
              <input formControlName="priceAdjustmentCurrency" maxlength="3" style="text-transform:uppercase;" />
            </div>
            <div class="field" [class.invalid]="rowFieldInvalid(i, 'displayOrder')">
              <label>Order</label>
              <input type="number" min="0" formControlName="displayOrder" />
            </div>
            <div class="field" style="flex:0 0 auto;">
              <label class="toggle">
                <input type="checkbox" formControlName="isDefault" />
                <span>Default</span>
              </label>
            </div>
            <button type="button" class="btn btn-sm btn-danger modifier-remove" (click)="removeRow(i)">
              Remove
            </button>
          </div>
        }
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/modifier-groups">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create group') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .modifier-row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
      flex-wrap: wrap;
    }
    .modifier-row .field { flex: 1; min-width: 120px; }
    .modifier-remove { white-space: nowrap; }
  `]
})
export class ModifierGroupEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ModifierGroupsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    isRequired: [false],
    minSelect: [0, [Validators.required, Validators.min(0)]],
    maxSelect: [1, [Validators.required, Validators.min(1)]],
    modifiers: this.fb.array<FormGroup>([], [Validators.required])
  });

  get modifiersArray(): FormArray<FormGroup> {
    return this.form.controls.modifiers as FormArray<FormGroup>;
  }
  get modifierRows(): FormGroup[] {
    return this.modifiersArray.controls as FormGroup[];
  }

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.api.get(routeId).subscribe(g => {
        this.form.patchValue({
          name: g.name,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect
        });
        this.modifiersArray.clear();
        for (const m of g.modifiers) {
          this.modifiersArray.push(this.makeRow(
            m.name, m.priceAdjustmentAmount, m.priceAdjustmentCurrency,
            m.displayOrder, m.isDefault));
        }
      });
    } else {
      this.modifiersArray.push(this.makeRow('', 0, 'PKR', 0, false));
    }
  }

  addRow(): void {
    this.modifiersArray.push(this.makeRow('', 0, 'PKR', this.modifiersArray.length, false));
  }

  removeRow(index: number): void {
    this.modifiersArray.removeAt(index);
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
    if (c.errors['min']) return `Must be ≥ ${c.errors['min'].min}.`;
    if (c.errors['maxlength']) return 'Too long.';
    return 'Invalid.';
  }

  rowFieldInvalid(rowIndex: number, fieldName: string): boolean {
    const c = this.modifierRows[rowIndex]?.controls[fieldName];
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    if (raw.minSelect > raw.maxSelect) {
      this.form.controls.minSelect.setErrors({ server: 'Min cannot exceed Max.' });
      this.form.controls.minSelect.markAsTouched();
      return;
    }
    if (raw.isRequired && raw.minSelect < 1) {
      this.form.controls.minSelect.setErrors({ server: 'Required groups must have Min ≥ 1.' });
      this.form.controls.minSelect.markAsTouched();
      return;
    }

    this.saving.set(true);
    const modifiers: ModifierInput[] = this.modifiersArray.controls.map(g => {
      const f = (g as FormGroup).getRawValue() as any;
      return {
        name: f.name.trim(),
        priceAdjustmentAmount: Number(f.priceAdjustmentAmount),
        priceAdjustmentCurrency: (f.priceAdjustmentCurrency || 'PKR').toUpperCase(),
        displayOrder: Number(f.displayOrder),
        isDefault: !!f.isDefault
      };
    });

    const obs = this.isEdit()
      ? this.api.update({
          id: this.id()!,
          name: raw.name.trim(),
          isRequired: raw.isRequired,
          minSelect: Number(raw.minSelect),
          maxSelect: Number(raw.maxSelect),
          modifiers
        })
      : this.api.create({
          name: raw.name.trim(),
          isRequired: raw.isRequired,
          minSelect: Number(raw.minSelect),
          maxSelect: Number(raw.maxSelect),
          modifiers
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Group updated.' : 'Group created.');
        this.router.navigate(['/catalog/modifier-groups']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  private makeRow(name: string, amount: number, currency: string, order: number, isDefault: boolean): FormGroup {
    return this.fb.nonNullable.group({
      name: [name, [Validators.required, Validators.maxLength(150)]],
      priceAdjustmentAmount: [amount, [Validators.required]],
      priceAdjustmentCurrency: [currency, [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
      displayOrder: [order, [Validators.required, Validators.min(0)]],
      isDefault: [isDefault]
    });
  }
}
