import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoginTransitionService {
  readonly showTransition = signal(false);

  start(): void {
    this.showTransition.set(true);
  }

  end(): void {
    this.showTransition.set(false);
  }
}
