import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-warehouse-edit',
  imports: [],
  templateUrl: './warehouse-edit.html',
  styleUrl: './warehouse-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseEdit {
  readonly title = 'Warehouse Edit';
  readonly description = 'Functional implementation scaffold for Warehouse Edit.';
}