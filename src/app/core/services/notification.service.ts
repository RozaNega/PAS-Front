import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(message: string): void {
    console.log('SUCCESS:', message);
  }

  info(message: string, title?: string): void {
    if (title) {
      console.log(`INFO (${title}):`, message);
      return;
    }
    console.log('INFO:', message);
  }

  error(message: string): void {
    console.error('ERROR:', message);
  }
}



