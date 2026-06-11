import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../../core/services/auth.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { ProfileSidebarComponent, ProfileNavItem } from '../../../../shared/components/profile-sidebar/profile-sidebar.component';
import { DEFAULT_AVATAR_PATH } from '../../../../core/models/stored-user.model';

@Component({
  selector: 'app-storekeeper-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileSidebarComponent],
  template: `
    <section class="profile-page">
      <header class="page-header">
        <div class="header-content">
          <h1>My Profile</h1>
          <p>Manage your account and view your work statistics</p>
        </div>
        <div class="header-meta">
          <span class="role-badge">Storekeeper</span>
        </div>
      </header>

      <div class="profile-layout">
        <app-profile-sidebar
          [avatarUrl]="avatarUrl()"
          [fullName]="fullName()"
          [roleLabel]="'Storekeeper'"
          [department]="department()"
          [navItems]="navItems"
          [activeSection]="activeSection()"
          [stats]="stats()"
          (sectionChange)="setSection($event)"
          (photoChange)="onPhotoSelectedFromSidebar($event)"
        />

        <main class="profile-content">
          @switch (activeSection()) {
            @case ('overview') {
              <div class="content-card">
                <div class="content-card-header">
                  <h2>Account Overview</h2>
                </div>
                <div class="overview-grid">
                  <div class="info-field">
                    <span class="field-label">Full Name</span>
                    <span class="field-value">{{ fullName() }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Email Address</span>
                    <span class="field-value">{{ email() }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Username</span>
                    <span class="field-value">{{ username() }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Phone</span>
                    <span class="field-value">{{ phone() || 'Not set' }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Department</span>
                    <span class="field-value">{{ departmentDisplay() }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Position</span>
                    <span class="field-value">{{ position() || 'Not set' }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Employee Code</span>
                    <span class="field-value">{{ employeeCode() || 'Not set' }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Join Date</span>
                    <span class="field-value">{{ joinDateDisplay() }}</span>
                  </div>
                  <div class="info-field">
                    <span class="field-label">Account Status</span>
                    <span class="field-value">
                      <span class="status-badge" [class.active]="isActive()">
                        {{ isActive() ? 'Active' : 'Inactive' }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div class="stats-grid">
                @if (isLoading()) {
                  <div class="loading-pulse">Loading statistics...</div>
                } @else {
                  @for (card of kpiCards(); track card.desc) {
                    <div class="stat-card">
                      <div class="stat-icon" [class]="card.color"><i [class]="card.icon"></i></div>
                      <div class="stat-info">
                        <span class="stat-num">{{ card.value }}</span>
                        <span class="stat-desc">{{ card.desc }}</span>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            @case ('edit') {
              <div class="content-card">
                <div class="content-card-header">
                  <h2>Edit Profile</h2>
                  <p>Update your personal information</p>
                </div>
                <form class="edit-form" (ngSubmit)="saveProfile()">
                  <div class="photo-upload">
                    <div class="photo-preview" (click)="photoInput.click()">
                      @if (avatarUrl()) {
                        <img [src]="avatarUrl()" alt="Profile" />
                      } @else {
                        <div class="photo-placeholder">{{ initials() }}</div>
                      }
                      <div class="photo-overlay">
                        <i class="bi bi-camera-fill"></i>
                      </div>
                    </div>
                    <input #photoInput type="file" accept="image/*" class="photo-input" (change)="onPhotoSelected($event)" />
                    <p class="photo-hint">Click to change profile photo</p>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Full Name</label>
                      <input type="text" [(ngModel)]="editName" name="name" class="form-control" required />
                    </div>
                    <div class="form-group">
                      <label>Email</label>
                      <input type="email" [(ngModel)]="editEmail" name="email" class="form-control" required />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Phone</label>
                      <input type="tel" [(ngModel)]="editPhone" name="phone" class="form-control" />
                    </div>
                    <div class="form-group">
                      <label>Department</label>
                      <input type="text" [(ngModel)]="editDepartment" name="department" class="form-control" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Position</label>
                      <input type="text" [(ngModel)]="editPosition" name="position" class="form-control" />
                    </div>
                    <div class="form-group">
                      <label>Employee Code</label>
                      <input type="text" [(ngModel)]="editEmployeeCode" name="employeeCode" class="form-control" />
                    </div>
                  </div>
                  @if (saveMessage(); as msg) {
                    <div class="form-alert" [class.success]="msg.type === 'success'" [class.error]="msg.type === 'error'">
                      <i class="bi" [class.bi-check-circle]="msg.type === 'success'" [class.bi-exclamation-circle]="msg.type === 'error'"></i> {{ msg.text }}
                    </div>
                  }
                  <div class="form-actions">
                    <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                    <button type="submit" class="btn btn-primary" [disabled]="saving()">
                      @if (saving()) {
                        <span class="spinner-sm"></span> Saving...
                      } @else {
                        <i class="bi bi-check-lg"></i> Save Changes
                      }
                    </button>
                  </div>
                </form>
              </div>
            }

            @case ('password') {
              <div class="content-card">
                <div class="content-card-header">
                  <h2>Change Password</h2>
                  <p>Update your account password</p>
                </div>
                <form class="edit-form" (ngSubmit)="changePassword()">
                  <div class="form-group">
                    <label>Current Password</label>
                    <div class="password-input-wrap">
                      <input [type]="showCurrent ? 'text' : 'password'" [(ngModel)]="currentPassword" name="currentPassword" class="form-control" required />
                      <button type="button" class="toggle-password" (click)="showCurrent = !showCurrent">
                        <i class="bi" [class.bi-eye]="!showCurrent" [class.bi-eye-slash]="showCurrent"></i>
                      </button>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>New Password</label>
                      <div class="password-input-wrap">
                        <input [type]="showNew ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword" class="form-control" required minlength="6" />
                        <button type="button" class="toggle-password" (click)="showNew = !showNew">
                          <i class="bi" [class.bi-eye]="!showNew" [class.bi-eye-slash]="showNew"></i>
                        </button>
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Confirm New Password</label>
                      <div class="password-input-wrap">
                        <input [type]="showConfirm ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirmPassword" class="form-control" required minlength="6" />
                        <button type="button" class="toggle-password" (click)="showConfirm = !showConfirm">
                          <i class="bi" [class.bi-eye]="!showConfirm" [class.bi-eye-slash]="showConfirm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  @if (passwordError()) {
                    <div class="form-alert error"><i class="bi bi-exclamation-circle"></i> {{ passwordError() }}</div>
                  }
                  @if (passwordSuccess()) {
                    <div class="form-alert success"><i class="bi bi-check-circle"></i> {{ passwordSuccess() }}</div>
                  }
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary" [disabled]="changingPassword()">
                      @if (changingPassword()) {
                        <span class="spinner-sm"></span> Updating...
                      } @else {
                        <i class="bi bi-shield-lock"></i> Update Password
                      }
                    </button>
                  </div>
                </form>
              </div>
            }

            @case ('work') {
              <div class="content-card">
                <div class="content-card-header">
                  <h2>Work Activity</h2>
                  <p>Your recent stock management actions</p>
                </div>
                <div class="activity-timeline">
                  @for (item of workActivityItems(); track item.id) {
                    <div class="timeline-item">
                      <div class="timeline-icon" [class]="item.color">
                        <i [class]="item.icon"></i>
                      </div>
                      <div class="timeline-content">
                        <h4>{{ item.title }}</h4>
                        <p>{{ item.description }}</p>
                        <span class="timeline-time">{{ item.time }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <i class="bi bi-clock-history"></i>
                      <p>No recent activity</p>
                    </div>
                  }
                </div>
              </div>
            }

            @case ('reports') {
              <div class="content-card">
                <div class="content-card-header">
                  <h2>Monthly Performance</h2>
                  <p>Your stock management metrics for this month</p>
                </div>
                @if (isLoading()) {
                  <div class="loading-pulse">Loading performance data...</div>
                } @else {
                  <div class="perf-grid">
                    @for (card of perfCards(); track card.label) {
                      <div class="perf-card">
                        <div class="perf-value" [class]="card.color">{{ card.value }}</div>
                        <div class="perf-label">{{ card.label }}</div>
                        <div class="perf-trend">{{ card.trend || 'Live data' }}</div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: var(--text-color);
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.75rem 2rem;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 20px;
      position: relative;
      overflow: hidden;
    }
    .page-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, var(--primary-color), #f59e0b);
      border-radius: 4px 0 0 4px;
    }
    .header-content h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--text-color), var(--primary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .header-content p {
      margin: 0.35rem 0 0;
      color: var(--text-color-muted);
      font-size: 0.9rem;
    }
    .role-badge {
      padding: 0.35rem 1rem;
      border-radius: 20px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .profile-layout {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
    }
    .profile-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }
    .content-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 1.75rem;
    }
    .content-card-header {
      margin-bottom: 1.5rem;
    }
    .content-card-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
    }
    .content-card-header p {
      margin: 0.25rem 0 0;
      color: var(--text-color-muted);
      font-size: 0.85rem;
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .info-field {
      padding: 0.85rem 1rem;
      background: var(--surface-section);
      border-radius: 10px;
      border: 1px solid var(--surface-border);
    }
    .field-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.25rem;
    }
    .field-value {
      display: block;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-color);
    }
    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.7rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
    }
    .status-badge.active {
      background: #d1fae5;
      color: #065f46;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .stat-icon.blue { background: #dbeafe; color: #2563eb; }
    .stat-icon.green { background: #d1fae5; color: #059669; }
    .stat-icon.orange { background: #fef3c7; color: #d97706; }
    .stat-icon.purple { background: #ede9fe; color: #7c3aed; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-num { font-size: 1.35rem; font-weight: 800; line-height: 1.2; }
    .stat-desc { font-size: 0.8rem; color: var(--text-color-muted); }
    .edit-form { display: flex; flex-direction: column; gap: 1rem; }
    .photo-upload { text-align: center; margin-bottom: 0.5rem; }
    .photo-preview { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin: 0 auto 0.5rem; position: relative; cursor: pointer; border: 3px solid var(--surface-border); }
    .photo-preview img, .photo-placeholder { width: 100%; height: 100%; object-fit: cover; }
    .photo-placeholder { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary-color), #f59e0b); color: #fff; font-size: 2rem; font-weight: 700; }
    .photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: #fff; font-size: 1.5rem; }
    .photo-preview:hover .photo-overlay { opacity: 1; }
    .photo-input { display: none; }
    .photo-hint { font-size: 0.8rem; color: var(--text-color-muted); margin: 0; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-color); }
    .form-control { padding: 0.65rem 0.85rem; border: 1px solid var(--surface-border); border-radius: 10px; background: var(--surface-section); color: var(--text-color); font-size: 0.9rem; transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
    .form-control:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-focus-ring); }
    .password-input-wrap { position: relative; }
    .password-input-wrap .form-control { padding-right: 2.5rem; width: 100%; }
    .toggle-password { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-color-muted); cursor: pointer; padding: 0.25rem; font-size: 1rem; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: var(--primary-color); color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--surface-section); color: var(--text-color); border: 1px solid var(--surface-border); }
    .btn-secondary:hover { background: var(--surface-border); }
    .spinner-sm { width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .form-alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 500; }
    .form-alert.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .form-alert.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .activity-timeline { display: flex; flex-direction: column; gap: 0.25rem; }
    .timeline-item { display: flex; gap: 1rem; padding: 1rem; border-radius: 10px; transition: background 0.2s; }
    .timeline-item:hover { background: var(--surface-section); }
    .timeline-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
    .timeline-icon.primary { background: var(--primary-color-soft); color: var(--primary-color); }
    .timeline-icon.green { background: #d1fae5; color: #059669; }
    .timeline-icon.orange { background: #fef3c7; color: #d97706; }
    .timeline-icon.purple { background: #ede9fe; color: #7c3aed; }
    .timeline-icon.blue { background: #dbeafe; color: #2563eb; }
    .timeline-icon.red { background: #fef2f2; color: #dc2626; }
    .timeline-content h4 { margin: 0; font-size: 0.9rem; font-weight: 600; }
    .timeline-content p { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--text-color-muted); }
    .timeline-time { font-size: 0.75rem; color: var(--text-color-muted); margin-top: 0.25rem; display: block; }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-color-muted); }
    .empty-state i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .empty-state p { margin: 0; font-size: 0.9rem; }
    .perf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    .perf-card { background: var(--surface-section); border: 1px solid var(--surface-border); border-radius: 12px; padding: 1.25rem; text-align: center; }
    .perf-value { font-size: 2rem; font-weight: 800; line-height: 1.1; }
    .perf-value.green { color: #059669; }
    .perf-value.blue { color: #2563eb; }
    .perf-value.orange { color: #d97706; }
    .perf-value.purple { color: #7c3aed; }
    .perf-value.red { color: #dc2626; }
    .perf-value.teal { color: #0d9488; }
    .perf-label { font-size: 0.85rem; color: var(--text-color-muted); margin-top: 0.25rem; font-weight: 500; }
    .perf-trend { font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-color-muted); }
    .perf-trend.up { color: #059669; }
    .perf-trend.down { color: #dc2626; }

    @media (max-width: 900px) {
      .profile-layout { flex-direction: column; }
      .profile-sidebar { width: 100%; }
      .form-row { grid-template-columns: 1fr; }
      .overview-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StorekeeperProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dashboardStats = signal<DashboardStatistics | null>(null);

  protected readonly navItems: ProfileNavItem[] = [
    { id: 'overview', label: 'Overview', icon: 'bi bi-person' },
    { id: 'edit', label: 'Edit Profile', icon: 'bi bi-pencil' },
    { id: 'password', label: 'Change Password', icon: 'bi bi-shield-lock' },
    { id: 'work', label: 'Work Activity', icon: 'bi bi-clock-history' },
    { id: 'reports', label: 'Performance', icon: 'bi bi-bar-chart' },
  ];

  protected readonly activeSection = signal<string>('overview');
  protected readonly saving = signal(false);
  protected readonly saveMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly fullName = signal('Storekeeper');
  protected readonly email = signal('');
  protected readonly username = signal('');
  protected readonly phone = signal<string | null>(null);
  protected readonly department = signal<string | null>(null);
  protected readonly position = signal<string | null>(null);
  protected readonly employeeCode = signal<string | null>(null);
  protected readonly joinDate = signal<string | null>(null);
  protected readonly isActive = signal(true);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly defaultAvatar = DEFAULT_AVATAR_PATH;

  protected editName = '';
  protected editEmail = '';
  protected editPhone = '';
  protected editDepartment = '';
  protected editPosition = '';
  protected editEmployeeCode = '';

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected showCurrent = false;
  protected showNew = false;
  protected showConfirm = false;
  protected changingPassword = signal(false);
  protected passwordError = signal<string | null>(null);
  protected passwordSuccess = signal<string | null>(null);

  protected readonly departmentDisplay = computed(() => this.department() || 'Warehouse & Inventory');

  protected readonly joinDateDisplay = computed(() => {
    const d = this.joinDate();
    if (!d) return 'Not set';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  protected readonly stats = computed<{ label: string; value: string }[]>(() => {
    const s = this.dashboardStats();
    if (!s) return [];
    return [
      { label: 'Items Issued', value: String(s.issuedRequisitions ?? '—') },
      { label: 'Pending GRNs', value: String(s.approvedReceiving ?? '—') },
      { label: 'Stock Alerts', value: String(s.lowStockItemsCount ?? '—') },
      { label: 'Pending Issues', value: String(s.pendingRequisitions ?? '—') },
    ];
  });

  protected readonly kpiCards = computed(() => {
    const s = this.dashboardStats();
    if (!s) return [];
    return [
      { icon: 'bi bi-boxes', color: 'blue', value: (s.totalItems ?? 0).toLocaleString(), desc: 'Items in Stock' },
      { icon: 'bi bi-arrow-up-circle', color: 'green', value: String(s.issuedRequisitions ?? '—'), desc: 'Issued This Month' },
      { icon: 'bi bi-arrow-down-circle', color: 'orange', value: String(s.approvedReceiving ?? '—'), desc: 'GRNs Processed' },
      { icon: 'bi bi-truck', color: 'purple', value: String(s.pendingRequisitions ?? '—'), desc: 'Pending Requests' },
    ];
  });

  protected readonly perfCards = computed(() => {
    const s = this.dashboardStats();
    if (!s) return [];
    return [
      { value: String(s.issuedRequisitions ?? '—'), label: 'Items Issued', color: 'green', trend: '', trendIcon: '' },
      { value: String(s.approvedReceiving ?? '—'), label: 'GRNs Processed', color: 'blue', trend: '', trendIcon: '' },
      { value: String(s.pendingRequisitions ?? '—'), label: 'Transfers', color: 'orange', trend: '', trendIcon: '' },
      { value: String(s.lowStockItemsCount ?? '—'), label: 'Low Stock Alerts', color: 'purple', trend: '', trendIcon: '' },
      { value: String(s.outOfStockItemsCount ?? '—'), label: 'Out of Stock', color: 'red', trend: '', trendIcon: '' },
      { value: String(s.totalItems ?? '—'), label: 'Total Items', color: 'teal', trend: '', trendIcon: '' },
    ];
  });

  protected readonly workActivityItems = computed<{ id: number; title: string; description: string; time: string; icon: string; color: string }[]>(() => {
    const activities = this.dashboardStats()?.recentActivities;
    if (!activities?.length) return [];
    return activities.map((a: any, i: number) => ({
      id: i + 1,
      title: a.action || 'Activity',
      description: a.entityName || '',
      time: a.timeAgo || new Date(a.actionDate).toLocaleString(),
      icon: a.icon || 'bi bi-activity',
      color: a.color || 'primary',
    }));
  });

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
  }

  private loadUserData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.applyUser(user);
    }
    this.authService.currentUser$.subscribe(u => {
      if (u) this.applyUser(u);
    });
    const img = this.currentUserService.getProfileImageUrl();
    if (img) {
      this.avatarUrl.set(this.profileService.getDisplayUrl(img));
    }
    this.currentUserService.profileImageUrl$.subscribe(url => {
      if (url) {
        this.avatarUrl.set(this.profileService.getDisplayUrl(url));
      }
    });

    this.profileService.fetchProfileFromApi().subscribe({
      next: (userData) => {
        if (userData) this.applyUser(userData as unknown as User);
      },
    });
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getStatistics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.dashboardStats.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Could not load dashboard statistics');
      },
    });
  }

  private applyUser(user: User): void {
    this.fullName.set(user.fullName || 'Storekeeper');
    this.email.set(user.email || '');
    this.username.set(user.username || '');
    this.phone.set(user.phone || null);
    this.department.set(user.department || null);
    this.position.set(user.position || null);
    this.employeeCode.set(user.employeeCode || null);
    this.joinDate.set(user.joinDate || null);
    this.isActive.set(user.isActive !== false);

    this.editName = user.fullName || '';
    this.editEmail = user.email || '';
    this.editPhone = user.phone || '';
    this.editDepartment = user.department || '';
    this.editPosition = user.position || '';
    this.editEmployeeCode = user.employeeCode || '';
  }

  protected setSection(section: string): void {
    this.activeSection.set(section);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
    this.saveMessage.set(null);
  }

  protected initials(): string {
    const name = this.fullName()?.trim();
    if (!name) return 'SK';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts[1]?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadPhoto(file);
  }

  protected onPhotoSelectedFromSidebar(file: File): void {
    this.uploadPhoto(file);
  }

  private uploadPhoto(file: File): void {
    this.profileService.uploadProfilePhotoToApi(file).subscribe({
      next: (url) => this.avatarUrl.set(this.profileService.getDisplayUrl(url)),
      error: () => {
        this.profileService.applyLocalProfileImageFromFile(file).subscribe({
          next: (url) => this.avatarUrl.set(url),
        });
      },
    });
  }

  protected saveProfile(): void {
    this.saving.set(true);
    this.saveMessage.set(null);
    this.profileService.updateProfileViaApi({
      fullName: this.editName,
      email: this.editEmail,
      phone: this.editPhone || undefined,
      department: this.editDepartment || undefined,
      position: this.editPosition || undefined,
      employeeCode: this.editEmployeeCode || undefined,
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.succeeded) {
          this.saveMessage.set({ type: 'success', text: 'Profile saved successfully' });
          this.fullName.set(this.editName);
          this.email.set(this.editEmail);
          this.phone.set(this.editPhone || null);
          this.department.set(this.editDepartment || null);
          this.position.set(this.editPosition || null);
          this.employeeCode.set(this.editEmployeeCode || null);
        } else {
          this.saveMessage.set({ type: 'error', text: res.message || 'Failed to save profile' });
        }
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.message || 'API unavailable or invalid data';
        this.saveMessage.set({ type: 'error', text: msg });
        console.error('saveProfile error', err);
      },
    });
  }

  protected cancelEdit(): void {
    this.setSection('overview');
  }

  protected changePassword(): void {
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError.set('All fields are required');
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError.set('New password must be at least 6 characters');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('Passwords do not match');
      return;
    }
    this.changingPassword.set(true);
    this.authService.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: (res) => {
        this.changingPassword.set(false);
        if (res.succeeded) {
          this.passwordSuccess.set('Password updated successfully');
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.passwordError.set(res.message || 'Failed to update password');
          console.warn('changePassword returned success=false:', res);
        }
      },
      error: (err) => {
        this.changingPassword.set(false);
        this.passwordError.set('An error occurred. Please try again.');
        console.error('changePassword error:', err);
      },
    });
  }
}
