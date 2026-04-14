import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-release',
  imports: [],
  templateUrl: './stock-release.html',
  styleUrl: './stock-release.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRelease {
  readonly title = 'Stock Release';
  readonly description = 'Functional implementation scaffold for Stock Release.';
}