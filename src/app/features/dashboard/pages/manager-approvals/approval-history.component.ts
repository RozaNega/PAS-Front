import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface HistoryItem {
  id: string;
  srNumber: string;
  requester: string;
  decision: string;
  date: string;
}

@Component({
  selector: 'app-approval-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-history.component.html',
  styleUrls: ['./approval-history.component.scss']
})
export class ApprovalHistoryComponent {
  protected readonly history = signal<HistoryItem[]>([
    { id: '1', srNumber: 'SR-2024-118', requester: 'John Doe', decision: 'Approved', date: '2024-01-20' },
    { id: '2', srNumber: 'SR-2024-117', requester: 'Peter Chen', decision: 'Rejected', date: '2024-01-19' }
  ]);
}
