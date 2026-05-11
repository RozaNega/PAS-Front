import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceRequestService } from '../../services/service-request.service';
import { ServiceRequest } from '../../models/service-request.model';

@Component({
  selector: 'app-service-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-request-list.component.html',
  styleUrls: ['./service-request-list.component.scss']
})
export class ServiceRequestListComponent implements OnInit {
  readonly serviceRequestService = inject(ServiceRequestService);
  readonly router = inject(Router);
  
  searchTerm = signal('');
  statusFilter = signal('All');
  serviceRequests = signal<ServiceRequest[]>([]);
  isLoading = signal(false);
  
  statuses = ['All', 'Pending', 'Approved', 'Rejected', 'Issued'];
  
  ngOnInit(): void {
    this.loadServiceRequests();
  }
  
  loadServiceRequests(): void {
    this.isLoading.set(true);
    const params = {
      searchTerm: this.searchTerm(),
      status: this.statusFilter() !== 'All' ? this.statusFilter() : undefined
    };
    
    this.serviceRequestService.getServiceRequests(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.serviceRequests.set(response.data.items || []);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading service requests:', error);
        this.isLoading.set(false);
      }
    });
  }
  
  onSearchChange(): void {
    this.loadServiceRequests();
  }
  
  onStatusFilterChange(): void {
    this.loadServiceRequests();
  }
  
  viewServiceRequest(id: string): void {
    this.router.navigate(['/requisitions/service-requests', id]);
  }
  
  createNewRequest(): void {
    this.router.navigate(['/requisitions/service-requests/create']);
  }
  
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'issued':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }
}
