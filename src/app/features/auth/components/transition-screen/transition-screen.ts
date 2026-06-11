import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-transition-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transition-screen.html',
  styleUrl: './transition-screen.css',
})
export class TransitionScreen {
  readonly phase = signal(1);
  readonly progress = signal(0);
  readonly statusMessage = signal('Verifying Credentials...');
  readonly statusIndex = signal(0);
  readonly isSplitting = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly messages = [
    'Verifying Credentials...',
    'Checking Permissions...',
    'Access Approved...',
  ];

  constructor() {
    this.startSequence();
  }

  private startSequence(): void {
    this.phase.set(1);

    setTimeout(() => {
      this.phase.set(2);
      this.startProgress();
    }, 800);

    setTimeout(() => {
      this.phase.set(3);
      this.isSplitting.set(true);
    }, 2500);
  }

  private startProgress(): void {
    let current = 0;
    const totalSteps = 85;
    const stepTime = 20;
    let step = 0;

    this.intervalId = setInterval(() => {
      step++;
      current = Math.min(Math.round((step / totalSteps) * 100), 100);
      this.progress.set(current);

      if (current >= 33 && this.statusIndex() === 0) {
        this.statusIndex.set(1);
        this.statusMessage.set('Checking Permissions...');
      } else if (current >= 75 && this.statusIndex() === 1) {
        this.statusIndex.set(2);
        this.statusMessage.set('Access Approved...');
      }

      if (current >= 100) {
        if (this.intervalId) clearInterval(this.intervalId);
      }
    }, stepTime);
  }
}
