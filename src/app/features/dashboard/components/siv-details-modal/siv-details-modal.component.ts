import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SIVDetails } from '../../../../types/dashboard.types';

@Component({
  selector: 'app-siv-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './siv-details-modal.component.html',
  styleUrl: './siv-details-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SivDetailsModalComponent {
  readonly modal = inject(NgbActiveModal);
  readonly siv = input.required<SIVDetails>();

  print(): void {
    window.print();
  }

  email(): void {
    console.log('Emailing SIV:', this.siv().sivNumber);
    this.modal.close({ action: 'email', siv: this.siv() });
  }

  close(): void {
    this.modal.close();
  }
}
