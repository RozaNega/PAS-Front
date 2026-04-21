import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './Welcome.html',
  styleUrl: './Welcome.css',
})
export class Welcome implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['/auth/register']);
    }, 2000);
  }
}
