import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * The two password fields must match (BO-D12 tc 2).
 *
 * A group validator, so the mismatch is a property of the pair rather than of
 * either field: clearing the confirmation after a valid entry re-runs it, and
 * editing the new password re-validates the pair without a manual subscription.
 */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;

  if (typeof next !== 'string' || typeof confirm !== 'string' || next === '' || confirm === '') {
    return null;
  }

  return next === confirm ? null : { mismatch: true };
}
