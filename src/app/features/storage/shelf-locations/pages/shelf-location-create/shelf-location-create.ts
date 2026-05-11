import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShelfLocationForm } from '../../components/shelf-location-form/shelf-location-form';

@Component({
  selector: 'app-shelf-location-create',
  imports: [ShelfLocationForm],
  templateUrl: './shelf-location-create.html',
  styleUrl: './shelf-location-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationCreate {
  readonly title = 'Shelf Location Create';
  readonly description = 'Create a new shelf location in the warehouse.';
}