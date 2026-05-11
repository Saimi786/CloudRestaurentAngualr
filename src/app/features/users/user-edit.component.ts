import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchesApi } from '../../core/api/branches.api';
import { RolesApi } from '../../core/api/roles.api';
import { UsersApi } from '../../core/api/users.api';
import { applyServerErrors, userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, RoleDto, UserDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ isEdit() ? 'Edit User' : 'New User' }}</h1>
        <p class="muted">{{ isEdit() ? 'Update name, status, and roles. Use "Reset password" below to change credentials.' : 'Create an account that can sign in to your tenant.' }}</p>
      </div>
      <a class="btn" routerLink="/users">← Back</a>
    </div>

    <form class="form panel" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row">
        <div class="field" [class.invalid]="invalid('email')">
          <label>Email</label>
          <input type="email" formControlName="email" autocomplete="off" />
          @if (invalid('email')) { <div class="field-error">{{ errorOf('email') }}</div> }
        </div>
        <div class="field" [class.invalid]="invalid('fullName')">
          <label>Full Name</label>
          <input formControlName="fullName" />
          @if (invalid('fullName')) { <div class="field-error">{{ errorOf('fullName') }}</div> }
        </div>
      </div>

      @if (!isEdit()) {
        <div class="form-row">
          <div class="field" [class.invalid]="invalid('password')">
            <label>Initial Password</label>
            <input type="password" formControlName="password" autocomplete="new-password" />
            <small class="muted">8+ chars, with upper, lower, digit, and a non-alphanumeric character.</small>
            @if (invalid('password')) { <div class="field-error">{{ errorOf('password') }}</div> }
          </div>
        </div>
      } @else {
        <div class="form-row">
          <div class="field">
            <label>Status</label>
            <label class="toggle">
              <input type="checkbox" formControlName="isActive" />
              <span>{{ form.controls.isActive.value ? 'Active' : 'Inactive' }}</span>
            </label>
          </div>
        </div>
      }

      <div class="fieldset-title">Roles</div>
      <div class="form-row">
        <div class="field" [class.invalid]="form.controls.roles.touched && form.controls.roles.errors?.['server']">
          <label>Assigned roles</label>
          @if (loadingRoles()) {
            <select disabled><option>Loading roles…</option></select>
          } @else {
            <select multiple class="role-select" size="6"
                    (change)="onRolesChange($any($event.target))">
              @for (role of availableRoles(); track role.name) {
                <option [value]="role.name" [attr.selected]="hasRole(role.name) ? '' : null">{{ role.name }}</option>
              }
            </select>
          }
          <small>
            Hold <kbd>Ctrl</kbd> (or <kbd>⌘</kbd> on Mac) to pick multiple roles.
            @if (form.controls.roles.value.length > 0) {
              <strong> · {{ form.controls.roles.value.length }} selected</strong>
            }
          </small>
          @if (form.controls.roles.touched && form.controls.roles.errors?.['server']) {
            <div class="field-error">{{ form.controls.roles.errors?.['server'] }}</div>
          }
        </div>
      </div>
      @if (form.controls.roles.value.length > 0) {
        <div class="role-pills">
          @for (r of form.controls.roles.value; track r) {
            <span class="role-pill">{{ r }} <button type="button" (click)="toggleRole(r, false)" title="Remove">×</button></span>
          }
        </div>
      }

      <div class="fieldset-title">Branches</div>
      <p class="muted" style="margin:0 0 0.5rem; font-size:0.85rem;">
        Restricts this user to the selected branches. Leave empty for a tenant-wide admin who can see every branch.
      </p>
      <div class="roles-grid">
        @if (loadingBranches()) {
          <span class="muted">Loading branches…</span>
        } @else if (availableBranches().length === 0) {
          <span class="muted">No branches available.</span>
        } @else {
          @for (b of availableBranches(); track b.id) {
            <label class="role-checkbox">
              <input type="checkbox"
                     [checked]="hasBranch(b.id)"
                     (change)="toggleBranch(b.id, $any($event.target).checked)" />
              <span>{{ b.name }} <small class="muted">({{ b.code }})</small></span>
            </label>
          }
        }
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="field" [class.invalid]="invalid('maxDiscountPercent')">
          <label>Max discount % (POS)</label>
          <input type="number" min="0" max="100" step="0.01" formControlName="maxDiscountPercent" placeholder="unlimited" />
          <small class="muted">Cap on the discount this user can apply at the POS. Leave blank for managers/admins.</small>
          @if (invalid('maxDiscountPercent')) { <div class="field-error">{{ errorOf('maxDiscountPercent') }}</div> }
        </div>
      </div>

      <div class="form-actions">
        <a class="btn" routerLink="/users">Cancel</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create user') }}
        </button>
      </div>
    </form>

    @if (isEdit()) {
      <div class="panel" style="margin-top:1rem;max-width:720px;">
        <h2 style="margin:0 0 0.75rem; font-size:1rem;">Reset password</h2>
        <p class="muted" style="margin:0 0 0.75rem;">Sets a new password for this user. They'll use it on next sign-in.</p>
        <form class="form" [formGroup]="resetForm" (ngSubmit)="resetPassword()" style="gap:0.75rem;">
          <div class="form-row">
            <div class="field" [class.invalid]="resetInvalid('newPassword')">
              <label>New Password</label>
              <input type="password" formControlName="newPassword" autocomplete="new-password" />
              @if (resetInvalid('newPassword')) { <div class="field-error">{{ resetErrorOf('newPassword') }}</div> }
            </div>
          </div>
          <div class="form-actions" style="margin-top:0;">
            <button type="submit" class="btn" [disabled]="resetSaving()">
              {{ resetSaving() ? 'Saving…' : 'Reset password' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.5rem 1rem;
    }
    .role-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--c-border);
      border-radius: var(--radius-md);
      transition: all var(--t-fast);
      &:hover { background: var(--c-surface-hover); }
      input { accent-color: var(--c-primary); }
    }

    /* Multi-role select dropdown */
    .role-select {
      width: 100%;
      padding: 0.5rem 0.7rem;
      font-family: inherit;
      font-size: 0.9rem;
      border: 1px solid var(--c-border-strong);
      border-radius: var(--radius-md);
      background: var(--c-surface);

      option {
        padding: 0.45rem 0.7rem;
        border-radius: 4px;
      }
      option:checked {
        background: var(--c-primary) linear-gradient(0deg, var(--c-primary), var(--c-primary));
        color: #fff;
        font-weight: 600;
      }
      &:focus {
        outline: none;
        border-color: var(--c-primary);
        box-shadow: var(--shadow-focus);
      }
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 0.05rem 0.35rem;
      background: var(--c-surface-alt);
      border: 1px solid var(--c-border);
      border-radius: 4px;
    }

    .role-pills {
      display: flex; flex-wrap: wrap; gap: 0.35rem;
      margin-top: 0.5rem;
    }
    .role-pill {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.25rem 0.35rem 0.25rem 0.7rem;
      background: var(--c-primary-soft);
      color: var(--c-primary-active);
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 600;
      button {
        width: 18px; height: 18px;
        border-radius: 50%;
        border: none;
        background: rgba(79, 70, 229, 0.15);
        color: var(--c-primary-active);
        cursor: pointer;
        font-size: 0.85rem;
        line-height: 1;
        display: grid; place-items: center;
        &:hover { background: var(--c-danger); color: #fff; }
      }
    }
    .toggle {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0;
      input { accent-color: #3b82f6; }
    }
  `]
})
export class UserEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly id = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== null);
  protected readonly saving = signal(false);
  protected readonly resetSaving = signal(false);
  protected readonly availableRoles = signal<RoleDto[]>([]);
  protected readonly loadingRoles = signal(true);
  protected readonly availableBranches = signal<BranchDto[]>([]);
  protected readonly loadingBranches = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    password: ['', []], // validators applied dynamically when not edit
    isActive: [true],
    roles: this.fb.nonNullable.control<string[]>([]),
    branchIds: this.fb.nonNullable.control<string[]>([]),
    maxDiscountPercent: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(100)])
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    this.rolesApi.list().subscribe({
      next: list => { this.availableRoles.set(list); this.loadingRoles.set(false); },
      error: err => { this.loadingRoles.set(false); this.notify.error(userMessage(err)); }
    });
    this.branchesApi.list(undefined, false).subscribe({
      next: list => { this.availableBranches.set(list); this.loadingBranches.set(false); },
      error: err => { this.loadingBranches.set(false); this.notify.error(userMessage(err)); }
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.form.controls.email.disable();
      this.api.get(routeId).subscribe(u => this.patchFromUser(u));
    } else {
      this.form.controls.password.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/[A-Z]/),
        Validators.pattern(/[a-z]/),
        Validators.pattern(/[0-9]/),
        Validators.pattern(/[^A-Za-z0-9]/)
      ]);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  hasRole(name: string): boolean {
    return this.form.controls.roles.value.includes(name);
  }

  toggleRole(name: string, checked: boolean): void {
    const current = new Set(this.form.controls.roles.value);
    if (checked) current.add(name); else current.delete(name);
    this.form.controls.roles.setValue([...current]);
    this.form.controls.roles.markAsDirty();
  }

  /** Browser <select multiple> change handler — read every selected <option>. */
  onRolesChange(select: HTMLSelectElement): void {
    const picked = Array.from(select.selectedOptions).map(o => o.value);
    this.form.controls.roles.setValue(picked);
    this.form.controls.roles.markAsDirty();
  }

  hasBranch(id: string): boolean {
    return this.form.controls.branchIds.value.includes(id);
  }

  toggleBranch(id: string, checked: boolean): void {
    const current = new Set(this.form.controls.branchIds.value);
    if (checked) current.add(id); else current.delete(id);
    this.form.controls.branchIds.setValue([...current]);
    this.form.controls.branchIds.markAsDirty();
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
    if (c.errors['email']) return 'Invalid email.';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['pattern']) return 'Password rules not met (need upper/lower/digit/symbol).';
    if (c.errors['maxlength']) return 'Too long.';
    return 'Invalid.';
  }

  resetInvalid(field: string): boolean {
    const c = this.resetForm.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  resetErrorOf(field: string): string {
    const c = this.resetForm.get(field);
    if (!c?.errors) return '';
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required.';
    if (c.errors['minlength']) return 'Minimum 8 characters.';
    return 'Invalid.';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const cap = raw.maxDiscountPercent === null || raw.maxDiscountPercent === undefined || isNaN(raw.maxDiscountPercent as number)
      ? null
      : Number(raw.maxDiscountPercent);

    const obs = this.isEdit()
      ? this.api.update(this.id()!, {
          fullName: raw.fullName.trim(),
          isActive: raw.isActive,
          roles: raw.roles,
          branchIds: raw.branchIds,
          maxDiscountPercent: cap
        })
      : this.api.create({
          email: raw.email.trim(),
          fullName: raw.fullName.trim(),
          password: raw.password,
          roles: raw.roles,
          branchIds: raw.branchIds,
          maxDiscountPercent: cap
        });

    obs.subscribe({
      next: () => {
        this.notify.success(this.isEdit() ? 'User updated.' : 'User created.');
        this.router.navigate(['/users']);
      },
      error: err => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notify.error(userMessage(err));
      }
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.resetSaving.set(true);
    this.api.resetPassword(this.id()!, { newPassword: this.resetForm.controls.newPassword.value })
      .subscribe({
        next: () => {
          this.notify.success('Password reset.');
          this.resetForm.reset({ newPassword: '' });
          this.resetSaving.set(false);
        },
        error: err => {
          this.resetSaving.set(false);
          if (!applyServerErrors(this.resetForm, err)) this.notify.error(userMessage(err));
        }
      });
  }

  private patchFromUser(u: UserDto): void {
    this.form.patchValue({
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      roles: u.roles,
      branchIds: u.branchIds ?? [],
      maxDiscountPercent: u.maxDiscountPercent
    });
  }
}
