import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-shelf-location-list',
  imports: [],
  templateUrl: './shelf-location-list.html',
  styleUrl: './shelf-location-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationList {
  readonly title = 'Shelf Location List';
  readonly description = 'Functional implementation scaffold for Shelf Location List.';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}