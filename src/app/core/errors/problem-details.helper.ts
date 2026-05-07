import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { ProblemDetails } from '../models';

export function asProblemDetails(err: unknown): ProblemDetails | null {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
    return err.error as ProblemDetails;
  }
  return null;
}

export function userMessage(err: unknown): string {
  const pd = asProblemDetails(err);
  if (pd?.detail) return pd.detail;
  if (pd?.title) return pd.title;
  if (err instanceof HttpErrorResponse) return `Request failed (${err.status}).`;
  return 'Something went wrong. Please try again.';
}

/**
 * Apply field-level ProblemDetails errors to a reactive form.
 * The API returns errors keyed by PascalCase property names (e.g. "DefaultCurrency");
 * the form controls use camelCase. We try both.
 */
export function applyServerErrors(form: FormGroup, err: unknown): boolean {
  const pd = asProblemDetails(err);
  if (!pd?.errors) return false;

  let appliedToAnyControl = false;
  for (const [field, messages] of Object.entries(pd.errors)) {
    const control = findControl(form, field);
    if (control) {
      control.setErrors({ server: messages.join(' ') });
      control.markAsTouched();
      appliedToAnyControl = true;
    }
  }
  return appliedToAnyControl;
}

function findControl(form: FormGroup, field: string) {
  return (
    form.get(field) ??
    form.get(toCamel(field)) ??
    form.get(field.split('.').map(toCamel).join('.'))
  );
}

function toCamel(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}
