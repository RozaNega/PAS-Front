import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-pages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pages.html',
  styleUrl: './pages.css',
})
export class Pages {}
