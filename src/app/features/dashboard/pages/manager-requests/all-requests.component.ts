import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ManagerDataService,
  ManagerRequestRow,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-all-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-requests.component.html',
  styleUrls: ['./all-requests.component.scss']
})
export class AllRequestsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);

  protected readonly requests = signal<ManagerRequestRow[]>([]);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.managerData.syncServiceRequests().subscribe(() => {
      this.requests.set(this.managerData.requestRows());
    });
  }
}
