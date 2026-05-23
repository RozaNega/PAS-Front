import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ManagerDataService,
  ManagerSivRow as StoreIssueVoucher,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-pending-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-sivs.component.html',
  styleUrls: ['./pending-sivs.component.scss']
})
export class PendingSIVsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);

  protected readonly sivs = signal<StoreIssueVoucher[]>([]);

  ngOnInit(): void {
    this.managerData
      .getSivs()
      .subscribe((sivs) => this.sivs.set(sivs.filter((siv) => siv.status === 'Pending')));
  }

  issueSiv(id: string): void {
    if (confirm('Are you sure you want to issue this SIV?')) {
      this.sivs.update((sivs) => sivs.filter((s) => s.id !== id));
      alert('This SIV should be issued from the backend/storekeeper workflow.');
    }
  }
}
