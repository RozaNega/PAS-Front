import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shelf-location-edit',
  imports: [],
  templateUrl: './shelf-location-edit.html',
  styleUrl: './shelf-location-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationEdit {
  readonly title = 'Shelf Location Edit';
  readonly description = 'Functional implementation scaffold for Shelf Location Edit.';
}