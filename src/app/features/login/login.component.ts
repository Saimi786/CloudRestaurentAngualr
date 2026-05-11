import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['admin@demo.local', [Validators.required, Validators.email]],
    password: ['Admin@12345!', [Validators.required, Validators.minLength(6)]]
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        // SuperAdmin lands on the platform console (their natural home); everyone else
        // goes to the tenant dashboard. The top-bar SuperAdmin button still lets them
        // jump back to the platform area whenever they want.
        const landing = this.auth.hasRole('SuperAdmin') ? '/platform' : '/dashboard';
        this.router.navigate([landing]);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.status === 401
          ? 'Invalid email or password.'
          : 'Something went wrong. Please try again.');
      }
    });
  }
}
