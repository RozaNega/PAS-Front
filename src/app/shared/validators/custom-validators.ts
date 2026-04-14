import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CustomValidators {
  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return value.trim().length === value.length ? null : { whitespace: true };
  }
}



