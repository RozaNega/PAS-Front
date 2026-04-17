import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-stock-list',
  imports: [],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockList {
  readonly title = 'Stock List';
  readonly description = 'Functional implementation scaffold for Stock List.';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}