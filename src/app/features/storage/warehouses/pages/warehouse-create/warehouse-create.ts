import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-warehouse-create',
  imports: [],
  templateUrl: './warehouse-create.html',
  styleUrl: './warehouse-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseCreate {
  readonly title = 'Warehouse Create';
  readonly description = 'Functional implementation scaffold for Warehouse Create.';
}