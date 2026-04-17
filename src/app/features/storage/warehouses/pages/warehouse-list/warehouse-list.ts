import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-warehouse-list',
  imports: [],
  templateUrl: './warehouse-list.html',
  styleUrl: './warehouse-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseList {
  readonly title = 'Warehouse List';
  readonly description = 'Functional implementation scaffold for Warehouse List.';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}