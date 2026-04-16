import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
  standalone: false,
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number, currencyCode: string = 'USD'): string {
    if (value === null || value === undefined) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

@Pipe({
  name: 'numberFormat',
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number, digits = 0): string {
    if (value === null || value === undefined) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }
}

@Pipe({
  name: 'percentageFormat',
})
export class PercentageFormatPipe implements PipeTransform {
  transform(value: number, digits = 2): string {
    if (value === null || value === undefined) {
      return '';
    }
    return `${value.toFixed(digits)}%`;
  }
}
