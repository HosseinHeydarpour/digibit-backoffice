import { FormBuilder } from '@angular/forms';

import { passwordsMatch } from './profile-validators';

describe('passwordsMatch (BO-D12 tc 2)', () => {
  const fb = new FormBuilder();

  function form(newPassword: string, confirmPassword: string) {
    return fb.nonNullable.group(
      { newPassword: [newPassword], confirmPassword: [confirmPassword] },
      { validators: passwordsMatch },
    );
  }

  it('accepts two equal passwords', () => {
    expect(form('NewPassword123', 'NewPassword123').valid).toBe(true);
  });

  it('rejects a mismatch', () => {
    const group = form('NewPassword123', 'OtherPassword123');

    expect(group.hasError('mismatch')).toBe(true);
    expect(group.valid).toBe(false);
  });

  it('stays quiet while the confirmation is empty', () => {
    expect(form('NewPassword123', '').hasError('mismatch')).toBe(false);
  });
});
