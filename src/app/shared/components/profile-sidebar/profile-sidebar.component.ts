import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_AVATAR_PATH } from '../../../core/models/stored-user.model';

export interface ProfileNavItem {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="profile-sidebar">
      <div class="profile-card">
        <div class="profile-avatar" (click)="fileInput.click()">
          @if (avatarUrl()) {
            <img [src]="avatarUrl()" alt="Profile" (error)="$event.target.src = defaultAvatar" />
          } @else {
            <div class="avatar-placeholder">{{ initials() }}</div>
          }
          <div class="avatar-overlay">
            <i class="bi bi-camera-fill"></i>
          </div>
          <input
            #fileInput
            type="file"
            accept="image/*"
            (change)="onFileSelected($event)"
          />
        </div>
        <h3 class="profile-name">{{ fullName() }}</h3>
        <p class="profile-role">{{ roleLabel() }}</p>
        @if (department()) {
          <p class="profile-dept">{{ department() }}</p>
        }
        <p class="photo-hint">Click photo to change</p>
      </div>

      <nav class="profile-nav">
        @for (item of navItems(); track item.id) {
          <button
            type="button"
            class="profile-nav-item"
            [class.active]="activeSection() === item.id"
            (click)="sectionChange.emit(item.id)"
          >
            <i [class]="item.icon"></i>
            <span>{{ item.label }}</span>
          </button>
        }
      </nav>

      @if (stats().length > 0) {
        <div class="profile-stats">
          <h4 class="stats-title">Quick Stats</h4>
          @for (stat of stats(); track stat.label) {
            <div class="stat-row">
              <span class="stat-label">{{ stat.label }}</span>
              <span class="stat-value">{{ stat.value }}</span>
            </div>
          }
        </div>
      }
    </aside>
  `,
  styles: [`
    .profile-sidebar {
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .profile-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 2rem 1.5rem 1.25rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .profile-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-color), #8b5cf6, #06b6d4);
    }
    .profile-avatar {
      width: 96px;
      height: 96px;
      margin: 0 auto 0.85rem;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--primary-color);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      position: relative;
      cursor: pointer;
    }
    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
      color: #fff;
      font-size: 1.75rem;
      font-weight: 700;
    }
    .avatar-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: #fff;
      font-size: 1.5rem;
      border-radius: 50%;
    }
    .profile-avatar:hover .avatar-overlay {
      opacity: 1;
    }
    .profile-avatar input {
      display: none;
    }
    .profile-name {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-color);
    }
    .profile-role {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: var(--primary-color);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .profile-dept {
      margin: 0.15rem 0 0;
      font-size: 0.8rem;
      color: var(--text-color-muted);
    }
    .photo-hint {
      margin: 0.5rem 0 0;
      font-size: 0.7rem;
      color: var(--text-color-muted);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .profile-card:hover .photo-hint {
      opacity: 1;
    }
    .profile-nav {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .profile-nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 1rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--text-color-muted);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
    }
    .profile-nav-item:hover {
      background: var(--primary-color-soft);
      color: var(--primary-color);
    }
    .profile-nav-item.active {
      background: var(--primary-color);
      color: #fff;
      font-weight: 600;
    }
    .profile-nav-item i {
      font-size: 1.1rem;
      width: 1.25rem;
      text-align: center;
    }
    .profile-stats {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 1.25rem;
    }
    .stats-title {
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--surface-border);
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-color-muted);
    }
    .stat-value {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-color);
    }
  `]
})
export class ProfileSidebarComponent {
  protected defaultAvatar = DEFAULT_AVATAR_PATH;

  readonly avatarUrl = input<string | null>(null);
  readonly fullName = input<string>('User');
  readonly roleLabel = input<string>('Staff');
  readonly department = input<string | null>(null);
  readonly navItems = input<ProfileNavItem[]>([]);
  readonly activeSection = input<string>('overview');
  readonly stats = input<{ label: string; value: string }[]>([]);

  readonly sectionChange = output<string>();
  readonly photoChange = output<File>();

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.photoChange.emit(file);
    }
    input.value = '';
  }

  protected initials(): string {
    const name = this.fullName()?.trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts[1]?.[0] ?? '';
    return (first + last).toUpperCase();
  }
}
