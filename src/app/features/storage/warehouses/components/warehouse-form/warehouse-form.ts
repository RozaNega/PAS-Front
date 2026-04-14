import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-warehouse-form',
  imports: [],
  templateUrl: './warehouse-form.html',
  styleUrl: './warehouse-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseForm {
  readonly title = 'Warehouse Form';
  readonly description = 'Functional implementation scaffold for Warehouse Form.';
}