import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-form',
  imports: [],
  templateUrl: './stock-form.html',
  styleUrl: './stock-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockForm {
  readonly title = 'Stock Form';
  readonly description = 'Functional implementation scaffold for Stock Form.';
}