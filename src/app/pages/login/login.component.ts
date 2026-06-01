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
    // Removed forced redirect to /auth/login so /auth/login/:role works
  }
}
