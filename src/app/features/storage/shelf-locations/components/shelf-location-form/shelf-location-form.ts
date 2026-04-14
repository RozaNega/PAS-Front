import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shelf-location-form',
  imports: [],
  templateUrl: './shelf-location-form.html',
  styleUrl: './shelf-location-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationForm {
  readonly title = 'Shelf Location Form';
  readonly description = 'Functional implementation scaffold for Shelf Location Form.';
}