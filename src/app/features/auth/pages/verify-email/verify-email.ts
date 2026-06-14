import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [NgOptimizedImage, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected readonly state = signal<'loading' | 'success' | 'error'>('loading');
  protected readonly message = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      this.message.set('No verification token found. Check the link in your email.');
      return;
    }
    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.state.set(res.succeeded ? 'success' : 'error');
        this.message.set(res.message);
      },
      error: () => {
        this.state.set('error');
        this.message.set('Verification failed. The link may be expired or invalid.');
      },
    });
  }
}
