import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService, NotificationDto } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-risk-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-alerts-page.component.html',
  styleUrl: './risk-alerts-page.component.scss',
})
export class RiskAlertsPageComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  searchQuery = '';
  filterType = signal<'All' | 'unread'>('All');

  protected readonly notifications = signal<NotificationDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filteredNotifications = computed<NotificationDto[]>(() => {
    let list = this.notifications();
    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(n => n.message.toLowerCase().includes(query));
    }
    if (this.filterType() === 'unread') {
      list = list.filter(n => !n.isRead);
    }
    return [...list].sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
  });

  protected readonly unreadCount = computed(() => {
    return this.notifications().filter(n => !n.isRead).length;
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.getAll({ pageNumber: 1, pageSize: 50 }).subscribe({
      next: (response) => {
        this.notifications.set(response.data?.notifications ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load notifications. Please try again.');
        this.loading.set(false);
      },
    });
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe({
      next: () => this.loadNotifications(),
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.loadNotifications(),
    });
  }

  dismissNotification(id: string): void {
    this.notificationService.deleteNotification(id).subscribe({
      next: () => this.loadNotifications(),
    });
  }

  takeAction(notif: NotificationDto): void {
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => this.loadNotifications(),
    });
  }

  refreshAlerts(): void {
    this.loadNotifications();
  }
}
