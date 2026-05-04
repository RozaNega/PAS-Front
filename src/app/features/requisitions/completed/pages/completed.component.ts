import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CompletedRequisition {
  id: string;
  srNumber: string;
  date: string;
  requester: string;
  items: number;
  sivNumber: string;
}

@Component({
  selector: 'app-completed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './completed.component.html',
  styleUrls: ['./completed.component.scss']
})
export class CompletedComponent {
  searchTerm = signal('');
  dateFilter = signal('Last 30 days');

  completedReqs = signal<CompletedRequisition[]>([
    { id: '1', srNumber: 'SR-2024-120', date: 'Dec 13', requester: 'Lisa Wong', items: 1, sivNumber: 'SIV-045' },
    { id: '2', srNumber: 'SR-2024-115', date: 'Dec 10', requester: 'John Doe', items: 3, sivNumber: 'SIV-044' },
    { id: '3', srNumber: 'SR-2024-110', date: 'Dec 05', requester: 'Sarah Smith', items: 2, sivNumber: 'SIV-043' },
    { id: '4', srNumber: 'SR-2024-108', date: 'Dec 03', requester: 'Mike John', items: 5, sivNumber: 'SIV-042' }
  ]);

  summary = signal({
    totalCompleted: 47,
    thisMonth: 15,
    totalValue: 23456,
    avgCompletionTime: 3.2,
    onTimeDelivery: 92,
    satisfaction: 4.5
  });

  exportData(): void {
    console.log('Exporting completed requisitions...');
  }
}
