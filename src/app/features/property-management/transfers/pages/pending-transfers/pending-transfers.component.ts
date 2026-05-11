import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Transfer {
  id: string;
  priority: 'urgent' | 'medium' | 'normal';
  requestedBy: string;
  requestedDate: string;
  property: {
    tag: string;
    name: string;
  };
  from: {
    location: string;
    details: string;
  };
  to: {
    location: string;
    details: string;
  };
  reason: string;
  requiredBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

@Component({
  selector: 'app-pending-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-transfers.component.html',
  styleUrls: ['./pending-transfers.component.scss']
})
export class PendingTransfersComponent {
  // Search and filters
  searchTerm = signal('');
  dateFrom = signal('Dec 01, 2024');
  dateTo = signal('Dec 15, 2024');
  statusFilter = signal('All');
  fromLocationFilter = signal('All Locations');
  toLocationFilter = signal('All');

  // Modal states
  showDetailsModal = signal(false);
  showApproveModal = signal(false);
  showCreateModal = signal(false);
  selectedTransfer = signal<Transfer | null>(null);

  // Summary data
  summary = signal({
    totalTransfers: 23,
    pending: 3,
    urgent: 1,
    approved: 12,
    completed: 8
  });

  // Transfers data
  transfers = signal<Transfer[]>([
    {
      id: 'TRANSFER-2024-001',
      priority: 'urgent',
      requestedBy: 'John Doe (IT Manager)',
      requestedDate: 'Dec 15, 2024',
      property: {
        tag: 'TAG-001',
        name: 'Dell XPS Laptop'
      },
      from: {
        location: 'IT Department, HQ Floor 1',
        details: 'Floor 1, Room 104'
      },
      to: {
        location: 'Branch Office, Marketing Dept',
        details: 'Floor 2, Room 205'
      },
      reason: 'Staff transfer to new location',
      requiredBy: 'Dec 20, 2024',
      status: 'pending'
    },
    {
      id: 'TRANSFER-2024-002',
      priority: 'medium',
      requestedBy: 'Sarah Smith (HR Manager)',
      requestedDate: 'Dec 14, 2024',
      property: {
        tag: 'TAG-003',
        name: 'Office Chair'
      },
      from: {
        location: 'HR Department, HQ Floor 1',
        details: 'Floor 1, Room 102'
      },
      to: {
        location: 'Warehouse A - Aisle B',
        details: 'Aisle B, Shelf 05'
      },
      reason: 'Surplus - no longer needed',
      requiredBy: 'Dec 25, 2024',
      status: 'pending'
    },
    {
      id: 'TRANSFER-2024-003',
      priority: 'normal',
      requestedBy: 'Mike Wilson (Warehouse Manager)',
      requestedDate: 'Dec 13, 2024',
      property: {
        tag: 'TAG-004',
        name: 'Server Rack'
      },
      from: {
        location: 'Warehouse A - Aisle A',
        details: 'Aisle A, Shelf 01'
      },
      to: {
        location: 'Data Center, HQ Floor 2',
        details: 'Floor 2, Server Room'
      },
      reason: 'New server deployment',
      requiredBy: 'Jan 05, 2025',
      status: 'pending'
    }
  ]);

  // Completed transfers history
  completedTransfers = signal([
    { id: 'TRF-2024-015', date: 'Dec 10', property: 'HP Monitor', fromTo: 'IT → Sales', status: 'completed' },
    { id: 'TRF-2024-014', date: 'Dec 08', property: 'Office Chair', fromTo: 'HR → WH', status: 'completed' },
    { id: 'TRF-2024-013', date: 'Dec 05', property: 'Dell Laptop', fromTo: 'IT → Branch', status: 'completed' },
    { id: 'TRF-2024-012', date: 'Dec 03', property: 'Server Rack', fromTo: 'WH → DC', status: 'completed' }
  ]);

  // Filter transfers
  filteredTransfers = computed(() => {
    let filtered = this.transfers();
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(term) ||
        t.requestedBy.toLowerCase().includes(term) ||
        t.property.tag.toLowerCase().includes(term) ||
        t.property.name.toLowerCase().includes(term) ||
        t.from.location.toLowerCase().includes(term) ||
        t.to.location.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter() !== 'All') {
      filtered = filtered.filter(t => t.status === this.statusFilter());
    }

    if (this.fromLocationFilter() !== 'All Locations') {
      filtered = filtered.filter(t => t.from.location.includes(this.fromLocationFilter()));
    }

    if (this.toLocationFilter() !== 'All') {
      filtered = filtered.filter(t => t.to.location.includes(this.toLocationFilter()));
    }

    return filtered;
  });

  // Get priority color
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'red';
      case 'medium': return 'yellow';
      case 'normal': return 'green';
      default: return 'gray';
    }
  }

  // Get priority emoji
  getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'medium': return '🟡';
      case 'normal': return '🟢';
      default: return '⚪';
    }
  }

  // Open details modal
  openDetailsModal(transfer: Transfer) {
    this.selectedTransfer.set(transfer);
    this.showDetailsModal.set(true);
  }

  // Open approve modal
  openApproveModal(transfer: Transfer) {
    this.selectedTransfer.set(transfer);
    this.showApproveModal.set(true);
  }

  // Open create modal
  openCreateModal() {
    this.showCreateModal.set(true);
  }

  // Close all modals
  closeModals() {
    this.showDetailsModal.set(false);
    this.showApproveModal.set(false);
    this.showCreateModal.set(false);
    this.selectedTransfer.set(null);
  }

  // Approve transfer
  approveTransfer() {
    if (this.selectedTransfer()) {
      const transfer = this.selectedTransfer()!;
      this.transfers.update(t => t.map(tr => 
        tr.id === transfer.id ? { ...tr, status: 'approved' as const } : tr
      ));
      this.closeModals();
    }
  }

  // Reject transfer
  rejectTransfer(transferId: string) {
    this.transfers.update(t => t.map(tr => 
      tr.id === transferId ? { ...tr, status: 'rejected' as const } : tr
    ));
  }

  // Apply filters
  applyFilters() {
    // Filter logic is handled by computed property
  }

  // Reset filters
  resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.fromLocationFilter.set('All Locations');
    this.toLocationFilter.set('All');
  }

  // Refresh data
  refreshData() {
    // Simulate refresh
  }
}
