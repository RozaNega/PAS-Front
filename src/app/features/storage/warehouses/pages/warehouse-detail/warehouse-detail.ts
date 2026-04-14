import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-warehouse-detail',
  imports: [],
  templateUrl: './warehouse-detail.html',
  styleUrl: './warehouse-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseDetail {
  readonly title = 'Warehouse Detail';
  readonly description = 'Functional implementation scaffold for Warehouse Detail.';
}