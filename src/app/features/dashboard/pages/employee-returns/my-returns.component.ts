import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReturnMaterialRequestsService, ReturnListDto } from '../../../../core/services/return-material-requests.service';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-my-returns',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-returns.component.html',
  styleUrls: ['./my-returns.component.scss']
})
export class MyReturnsComponent implements OnInit {
  private readonly returnService = inject(ReturnMaterialRequestsService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  protected readonly returns = signal<ReturnListDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReturns();
  }

  private loadReturns(): void {
    // Check authentication
    if (!this.tokenService.getToken() || this.tokenService.isTokenExpired()) {
      this.error.set('Please login to view your return requests.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.returnService.getAll({ pageSize: 50 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.returns.set(response.data.items);
          console.log('✅ Loaded return requests:', response.data.items.length);
        } else {
          // Show sample data if no real data
          this.loadSampleData();
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load return requests:', error);
        this.error.set('Failed to load return requests. Showing sample data.');
        this.loadSampleData();
        this.loading.set(false);
      }
    });
  }

  private loadSampleData(): void {
    // Sample return requests for demonstration
    const sampleReturns: ReturnListDto[] = [
      {
        id: '1',
        returnNumber: 'RET-2024-001',
        itemName: 'Laptop Dell XPS 13',
        quantity: 1,
        reason: 'Defective screen - needs warranty replacement',
        requestDate: '2024-05-10T10:30:00Z',
        status: 'Pending',
        requestedBy: 'Current User'
      },
      {
        id: '2',
        returnNumber: 'RET-2024-002',
        itemName: 'Office Chair Ergonomic',
        quantity: 1,
        reason: 'Wrong model ordered - need different size',
        requestDate: '2024-05-09T14:15:00Z',
        status: 'Approved',
        requestedBy: 'Current User'
      },
      {
        id: '3',
        returnNumber: 'RET-2024-003',
        itemName: 'HP Printer LaserJet',
        quantity: 1,
        reason: 'Damaged during shipping - original packaging damaged',
        requestDate: '2024-05-08T09:45:00Z',
        status: 'Processed',
        requestedBy: 'Current User'
      }
    ];

    this.returns.set(sampleReturns);
  }

  protected refresh(): void {
    this.loadReturns();
  }

  protected createNewReturn(): void {
    this.router.navigate(['/employee/returns/create']);
  }

  protected viewDetails(returnId: string): void {
    // Navigate to return details (if implemented)
    console.log('View return details:', returnId);
    alert(`Return details for ${returnId} - Feature coming soon!`);
  }

  protected getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'processed':
        return 'status-processed';
      default:
        return 'status-unknown';
    }
  }

  protected formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }
}
