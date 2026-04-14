import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shelf-location-create',
  imports: [],
  templateUrl: './shelf-location-create.html',
  styleUrl: './shelf-location-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationCreate {
  readonly title = 'Shelf Location Create';
  readonly description = 'Functional implementation scaffold for Shelf Location Create.';
}