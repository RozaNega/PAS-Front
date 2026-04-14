import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shelf-location-detail',
  imports: [],
  templateUrl: './shelf-location-detail.html',
  styleUrl: './shelf-location-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationDetail {
  readonly title = 'Shelf Location Detail';
  readonly description = 'Functional implementation scaffold for Shelf Location Detail.';
}