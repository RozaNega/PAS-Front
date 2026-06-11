import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginTransitionService } from './core/services/login-transition.service';
import { TransitionScreen } from './features/auth/components/transition-screen/transition-screen';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TransitionScreen],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly transitionSvc = inject(LoginTransitionService);
}

