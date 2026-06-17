import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { PendingRegistrationService, PendingRegistration } from '../../../../core/services/pending-registration.service';

@Component({
  selector: 'app-pending-registrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-registrations.component.html',
  styleUrls: ['./pending-registrations.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingRegistrationsComponent {
  private readonly pendingService = inject(PendingRegistrationService);

  protected readonly registrations = signal<PendingRegistration[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly actionInProgress = signal<string | null>(null);

  constructor() {
    this.loadPending();
  }

  protected loadPending(): void {
    this.loading.set(true);
    this.error.set('');
    this.pendingService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.registrations.set(res.data ?? []);
          } else {
            this.error.set(res.message || 'Failed to load pending registrations.');
          }
        },
        error: () => {
          this.error.set('Unable to connect. Please try again later.');
        },
      });
  }

  protected approve(id: string): void {
    this.actionInProgress.set(id);
    this.pendingService.approve(id)
      .pipe(finalize(() => this.actionInProgress.set(null)))
      .subscribe({
          next: (res) => {
            if (res.success) {
              this.registrations.update((list) => list.filter((r) => r.id !== id));
              this.pendingService.refreshCount();
            } else {
              this.error.set(res.message || 'Failed to approve registration.');
            }
          },
        error: () => {
          this.error.set('Unable to process approval. Please try again.');
        },
      });
  }

  protected reject(id: string): void {
    this.actionInProgress.set(id);
    this.pendingService.reject(id)
      .pipe(finalize(() => this.actionInProgress.set(null)))
      .subscribe({
          next: (res) => {
            if (res.success) {
              this.registrations.update((list) => list.filter((r) => r.id !== id));
              this.pendingService.refreshCount();
            } else {
              this.error.set(res.message || 'Failed to reject registration.');
            }
          },
        error: () => {
          this.error.set('Unable to process rejection. Please try again.');
        },
      });
  }
}
