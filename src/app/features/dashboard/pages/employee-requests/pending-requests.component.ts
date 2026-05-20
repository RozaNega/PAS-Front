import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequestService } from '../../../../features/requisition/service-requests/services/service-request.service';

interface Request {
  id: string;
  srNumber: string;
  title?: string;
  description?: string;
  priority?: string;
  status: string;
  submittedDate?: string;
  requester?: string;
  department?: string;
}

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss']
})
export class PendingRequestsComponent implements OnInit {
  private serviceRequestService = inject(ServiceRequestService);
  
  protected readonly loading = signal(false);
  protected readonly requests = signal<Request[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  ngOnInit(): void {
    this.loadRequests();
  }

  private loadRequests(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.serviceRequestService.getServiceRequests().subscribe({
      next: (response) => {
        // Filter only PENDING requests
        const mappedRequests: Request[] = response.data.items
          .filter((sr: any) => sr.status === 'Pending')
          .map(sr => ({
            id: sr.id,
            srNumber: sr.srNumber,
            status: sr.status,
            submittedDate: sr.requestDate || new Date().toISOString().split('T')[0],
            requester: sr.requesterName || 'Unknown',
            department: sr.department || 'Unknown'
          }));
        this.requests.set(mappedRequests);
        this.loading.set(false);
        console.log('Loaded pending requests:', mappedRequests);
      },
      error: (err) => {
        this.error.set('Failed to load requests');
        this.loading.set(false);
        console.error('Error loading requests:', err);
      }
    });
  }

  protected get filteredRequests(): Request[] {
    const search = this.searchTerm().toLowerCase();
    return this.requests().filter(req =>
      req.srNumber.toLowerCase().includes(search) ||
      req.requester?.toLowerCase().includes(search) ||
      req.department?.toLowerCase().includes(search)
    );
  }

  protected cancelRequest(requestId: string): void {
    const confirmCancel = confirm('Are you sure you want to cancel this request? This action cannot be undone.');
    if (confirmCancel) {
      console.log('Attempting to delete request:', requestId);
      this.serviceRequestService.deleteServiceRequest(requestId).subscribe({
        next: (response) => {
          console.log('Delete response:', response);
          
          // Verify deletion by checking if request still exists
          this.serviceRequestService.getServiceRequestById(requestId).subscribe({
            next: (checkResponse) => {
              console.log('Request still exists after delete attempt:', checkResponse);
              alert('Warning: Request deletion may have failed. Please contact support.');
              // Reload to show current state
              this.loadRequests();
            },
            error: (checkErr) => {
              // If we get a 404, the request was successfully deleted
              if (checkErr.status === 404) {
                console.log('Request successfully deleted from database (404 confirmed)');
                // Remove from pending list
                const requests = this.requests();
                const index = requests.findIndex(r => r.id === requestId);
                if (index !== -1) {
                  const updatedRequests = [...requests];
                  updatedRequests.splice(index, 1);
                  this.requests.set(updatedRequests);
                  console.log('Request removed from UI');
                }
                alert('Request cancelled and removed successfully!');
              } else {
                console.error('Unexpected error during verification:', checkErr);
                alert('Failed to verify request deletion. Please try again.');
              }
            }
          });
        },
        error: (err) => {
          console.error('Full error object:', err);
          console.error('Error status:', err.status);
          console.error('Error message:', err.message);
          console.error('Error response:', err.error);
          alert('Failed to cancel request. Please try again.');
        }
      });
    }
  }
}
