import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  ManagerDataService,
  ManagerRequestRow,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-issued-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-requests.component.html',
  styleUrls: ['./issued-requests.component.scss']
})
export class IssuedRequestsComponent implements OnInit, OnDestroy {
  private readonly managerData = inject(ManagerDataService);
  private readonly subs: Subscription[] = [];

  protected readonly requests = signal<ManagerRequestRow[]>([]);

  ngOnInit(): void {
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  loadRequests(): void {
    this.subs.push(
      this.managerData.syncServiceRequests().subscribe(() => {
        this.requests.set(this.managerData.requestRows('issued'));
      }),
    );
  }
}
