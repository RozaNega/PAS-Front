import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ManagerDataService,
  ManagerSivRow as StoreIssueVoucher,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-pending-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-sivs.component.html',
  styleUrls: ['./_sivs-common.scss']
})
export class PendingSIVsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);

  protected readonly title = 'Pending SIVs';
  protected readonly subtitle = 'SIVs awaiting issuance';
  protected readonly sivs = signal<StoreIssueVoucher[]>([]);

  get totalCount(): number { return this.sivs().length; }
  get totalValue(): number { return this.sivs().reduce((s, v) => s + v.totalValue, 0); }

  ngOnInit(): void {
    this.managerData
      .getSivs()
      .subscribe((sivs) => this.sivs.set(sivs.filter((siv) => siv.status === 'Pending')));
  }

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  getStatusClass(): string {
    return 'status-badge status-badge--pending';
  }

  issueSiv(id: string): void {
    if (confirm('Are you sure you want to issue this SIV?')) {
      this.sivs.update((sivs) => sivs.filter((s) => s.id !== id));
    }
  }
}
