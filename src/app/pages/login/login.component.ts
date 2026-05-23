import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    // REMOVED AUTO-REDIRECT: Landing page should stay visible until user clicks
    // void this.router.navigateByUrl('/auth/login');
    console.log('⚠️ Old LoginComponent loaded - this should not happen with standalone bootstrap');
  }
}
