import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsApi } from '../../../core/api/products.api';
import { RecipesApi } from '../../../core/api/recipes.api';
import { UnitsApi } from '../../../core/api/units.api';
import { applyServerErrors, userMessage } from '../../../core/errors/problem-details.helper';
import { ProductDto, RecipeIngredientInput, RecipeStepInput, UnitDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-recipe-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit Recipe' : 'New Recipe' }}</h1>
        <p class="muted">
          Pick the menu Product, then add stock-tracked ingredient products with quantities.
          Each ingredient's unit must be in the same group as the ingredient product's primary unit.
        </p>
      </div>
      <a class="btn" routerLink="/catalog/recipes">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalidControl(form.controls.productId)" style="flex: 2;">
          <label>Menu Product</label>
          <select formControlName="productId">
            <option value="">— select —</option>
            @for (p of menuProducts(); track p.id) {
              <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
            }
          </select>
          @if (invalidControl(form.controls.productId)) {
            <div class="field-error">{{ errorOf(form.controls.productId) }}</div>
          }
          @if (isEdit()) {
            <small class="muted">Product can't be changed once a recipe is created.</small>
          }
        </div>

        <div class="field" [class.invalid]="invalidControl(form.controls.batchYield)">
          <label>Batch Yield (portions)</label>
          <input type="number" min="0.0001" step="0.0001" formControlName="batchYield" />
          <small class="muted">How many portions one batch yields. Ingredient deduction divides by this.</small>
        </div>

        <div class="field" style="flex: 2;">
          <label>Notes (optional)</label>
          <input formControlName="notes" placeholder="Recipe notes / variant" />
        </div>
      </div>

      <div class="fieldset-title">
        Ingredients
        <button type="button" class="btn btn-sm" style="margin-left:1rem;" (click)="addRow()">+ Add ingredient</button>
      </div>

      @if (trackedProducts().length === 0 && !loadingProducts()) {
        <div class="muted" style="margin:0.5rem 0;">
          No stock-tracked products available. Edit a Product and enable "Stock tracked" first
          (e.g. Beef, Bun, Lettuce).
        </div>
      }

      @if (form.controls.ingredients.errors?.['required']) {
        <div class="field-error">A recipe must have at least one ingredient.</div>
      }

      <div formArrayName="ingredients">
        @for (row of ingredientRows; track $index; let i = $index) {
          <div [formGroupName]="i" class="ingredient-row">
            <div class="field" [class.invalid]="rowFieldInvalid(i, 'ingredientProductId')">
              <label>Ingredient</label>
              <select formControlName="ingredientProductId" (change)="onIngredientProductChange(i)">
                <option value="">— select —</option>
                @for (p of trackedProducts(); track p.id) {
                  <option [value]="p.id">{{ p.sku }} — {{ p.name }}</option>
                }
              </select>
            </div>

            <div class="field" [class.invalid]="rowFieldInvalid(i, 'quantity')">
              <label>Quantity</label>
              <input type="number" step="any" formControlName="quantity" />
            </div>

            <div class="field" [class.invalid]="rowFieldInvalid(i, 'unitId')">
              <label>Unit</label>
              <select formControlName="unitId">
                <option value="">— select —</option>
                @for (u of compatibleUnitsFor(i); track u.id) {
                  <option [value]="u.id">{{ u.code }}</option>
                }
              </select>
            </div>

            <div class="field" style="flex: 2;">
              <label>Note (optional)</label>
              <input formControlName="notes" placeholder="e.g. shredded, finely diced" />
            </div>

            <button type="button" class="btn btn-sm btn-danger ingredient-remove" (click)="removeRow(i)">
              Remove
            </button>
          </div>
        }
      </div>

      <div class="fieldset-title">
        Steps (optional)
        <button type="button" class="btn btn-sm" style="margin-left:1rem;" (click)="addStep()">+ Add step</button>
      </div>

      <div formArrayName="steps">
        @for (row of stepRows; track $index; let i = $index) {
          <div [formGroupName]="i" class="ingredient-row">
            <div class="field" style="flex: 0 0 60px;">
              <label>#</label>
              <input type="number" min="1" formControlName="stepNumber" />
            </div>
            <div class="field" style="flex: 4;">
              <label>Instruction</label>
              <input formControlName="instruction" placeholder="e.g. Sear 2 min per side" />
            </div>
            <div class="field" style="flex: 0 0 100px;">
              <label>Min</label>
              <input type="number" min="0" formControlName="durationMinutes" placeholder="—" />
            </div>
            <button type="button" class="btn btn-sm btn-danger ingredient-remove" (click)="removeStep(i)">
              Remove
            </button>
          </div>
        }
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/catalog/recipes">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create recipe') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .ingredient-row {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
      flex-wrap: wrap;
    }
    .ingredient-row .field { flex: 1; min-width: 140px; }
    .ingredient-remove { white-space: nowrap; }
  `]
})
export class RecipeEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RecipesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly unitsApi = inject(UnitsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly loadingProducts = signal(true);
  protected readonly menuProducts = signal<ProductDto[]>([]);
  protected readonly trackedProducts = signal<ProductDto[]>([]);
  protected readonly allUnits = signal<UnitDto[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    notes: [''],
    batchYield: [1, [Validators.required, Validators.min(0.0001)]],
    ingredients: this.fb.array<FormGroup>([], [Validators.required]),
    steps: this.fb.array<FormGroup>([])
  });

  get ingredientsArray(): FormArray<FormGroup> {
    return this.form.controls.ingredients as FormArray<FormGroup>;
  }
  get ingredientRows(): FormGroup[] {
    return this.ingredientsArray.controls as FormGroup[];
  }
  get stepsArray(): FormArray<FormGroup> {
    return this.form.controls.steps as FormArray<FormGroup>;
  }
  get stepRows(): FormGroup[] {
    return this.stepsArray.controls as FormGroup[];
  }

  constructor() {
    this.unitsApi.list({ includeInactive: true }).subscribe(list => this.allUnits.set(list));

    this.productsApi.list({}).subscribe({
      next: list => {
        this.menuProducts.set(list.filter(p => p.isActive));
        this.trackedProducts.set(list.filter(p => p.isStockTracked));
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false)
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.form.controls.productId.disable();
      this.api.get(routeId).subscribe(r => {
        this.form.patchValue({
          productId: r.productId,
          notes: r.notes ?? '',
          batchYield: r.batchYield || 1
        });
        this.ingredientsArray.clear();
        for (const i of r.ingredients) {
          this.ingredientsArray.push(this.makeRow(i.ingredientProductId, i.unitId, i.quantity, i.notes));
        }
        this.stepsArray.clear();
        for (const s of (r.steps ?? [])) {
          this.stepsArray.push(this.makeStepRow(s.stepNumber, s.instruction, s.durationMinutes));
        }
      });
    } else {
      // start with one empty row
      this.ingredientsArray.push(this.makeRow('', '', 0, null));
    }
  }

  addRow(): void {
    this.ingredientsArray.push(this.makeRow('', '', 0, null));
  }

  removeRow(index: number): void {
    this.ingredientsArray.removeAt(index);
  }

  addStep(): void {
    const next = this.stepsArray.length + 1;
    this.stepsArray.push(this.makeStepRow(next, '', null));
  }

  removeStep(index: number): void {
    this.stepsArray.removeAt(index);
  }

  onIngredientProductChange(index: number): void {
    // Pre-select the ingredient product's primary unit when picked.
    const row = this.ingredientRows[index];
    const productId = row.controls['ingredientProductId'].value;
    const product = this.trackedProducts().find(p => p.id === productId);
    if (product) row.controls['unitId'].setValue(product.unitId);
  }

  compatibleUnitsFor(index: number): UnitDto[] {
    const row = this.ingredientRows[index];
    const productId = row?.controls['ingredientProductId'].value;
    const product = this.trackedProducts().find(p => p.id === productId);
    if (!product) return [];
    const productUnit = this.allUnits().find(u => u.id === product.unitId);
    if (!productUnit) return [];
    return this.allUnits().filter(u => u.groupId === productUnit.groupId && u.isActive);
  }

  invalidControl(c: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return c.invalid && (c.touched || c.dirty);
  }

  rowFieldInvalid(rowIndex: number, fieldName: string): boolean {
    const c = this.ingredientRows[rowIndex]?.controls[fieldName];
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(c: { errors: any }): string {
    if (!c.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.ingredientsArray.length === 0) {
      this.notify.error('A recipe must have at least one ingredient.');
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();

    const ingredients: RecipeIngredientInput[] = this.ingredientsArray.controls.map(g => {
      const f = (g as FormGroup).getRawValue() as any;
      return {
        ingredientProductId: f.ingredientProductId,
        unitId: f.unitId,
        quantity: Number(f.quantity),
        notes: f.notes?.trim() || null
      };
    });

    const batchYield = Number(raw.batchYield) > 0 ? Number(raw.batchYield) : 1;

    const steps: RecipeStepInput[] = this.stepsArray.controls
      .map(g => (g as FormGroup).getRawValue() as any)
      .filter(s => s.instruction?.trim())
      .map(s => ({
        stepNumber: Number(s.stepNumber),
        instruction: s.instruction.trim(),
        durationMinutes: s.durationMinutes != null && s.durationMinutes !== ''
          ? Number(s.durationMinutes) : null
      }));

    const obs = this.isEdit()
      ? this.api.update({
          id: this.id()!, notes: raw.notes?.trim() || null,
          batchYield, ingredients,
          steps: steps.length > 0 ? steps : null
        })
      : this.api.create({
          productId: raw.productId, notes: raw.notes?.trim() || null,
          batchYield, ingredients,
          steps: steps.length > 0 ? steps : null
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'Recipe updated.' : 'Recipe created.');
        this.router.navigate(['/catalog/recipes']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  private makeRow(productId: string, unitId: string, quantity: number, notes: string | null): FormGroup {
    return this.fb.nonNullable.group({
      ingredientProductId: [productId, [Validators.required]],
      unitId: [unitId, [Validators.required]],
      quantity: [quantity, [Validators.required, Validators.min(0.000001)]],
      notes: [notes ?? '']
    });
  }

  private makeStepRow(stepNumber: number, instruction: string, durationMinutes: number | null): FormGroup {
    return this.fb.nonNullable.group({
      stepNumber: [stepNumber, [Validators.required, Validators.min(1)]],
      instruction: [instruction, [Validators.required, Validators.maxLength(1000)]],
      durationMinutes: [durationMinutes ?? null]
    });
  }
}
