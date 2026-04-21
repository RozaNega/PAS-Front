import { Injectable, signal } from '@angular/core';

interface ThemeOption {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

@Injectable({ providedIn: 'root' })
export class AuthThemeService {
  private readonly themeKey = 'africom-auth-dark';
  private readonly primaryKey = 'africom-auth-primary';

  readonly darkMode = signal(false);
  readonly selectedPrimary = signal('emerald');

  readonly primaryOptions: readonly ThemeOption[] = [
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'teal', label: 'Teal', value: '#14b8a6' },
    { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
    { id: 'sky', label: 'Sky', value: '#0ea5e9' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
    { id: 'indigo', label: 'Indigo', value: '#6366f1' },
    { id: 'violet', label: 'Violet', value: '#8b5cf6' },
    { id: 'fuchsia', label: 'Fuchsia', value: '#d946ef' },
    { id: 'rose', label: 'Rose', value: '#f43f5e' },
    { id: 'amber', label: 'Amber', value: '#f59e0b' },
    { id: 'lime', label: 'Lime', value: '#84cc16' },
    { id: 'slate', label: 'Slate', value: '#334155' },
  ];

  constructor() {
    this.restoreTheme();
    this.applyTheme();
  }

  toggleDarkMode(): void {
    this.darkMode.update((value) => !value);
    this.applyTheme();
    this.persistTheme();
  }

  setPrimary(optionId: string): void {
    if (!this.primaryOptions.some((option) => option.id === optionId)) {
      return;
    }

    this.selectedPrimary.set(optionId);
    this.applyTheme();
    this.persistTheme();
  }

  applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const authShell = document.querySelector('.auth-sakai') as HTMLElement | null;
    const body = document.body;
    const primary = this.primaryOptions.find((option) => option.id === this.selectedPrimary())?.value ?? '#10b981';
    const primarySoft = this.hexToSoft(primary);

    // Set variables on auth shell for live updates
    if (authShell) {
      authShell.style.setProperty('--auth-primary', primary);
      authShell.style.setProperty('--auth-primary-soft', primarySoft);
      authShell.style.setProperty('--primary-color', primary);
      authShell.style.setProperty('--primary-color-soft', primarySoft);
    }

    body.classList.toggle('auth-dark', this.darkMode());
  }

  private persistTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.themeKey, String(this.darkMode()));
    localStorage.setItem(this.primaryKey, this.selectedPrimary());
  }

  private restoreTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    this.darkMode.set(localStorage.getItem(this.themeKey) === 'true');

    const savedPrimary = localStorage.getItem(this.primaryKey);

    if (savedPrimary && this.primaryOptions.some((option) => option.id === savedPrimary)) {
      this.selectedPrimary.set(savedPrimary);
    }
  }

  private hexToSoft(hex: string): string {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return '#ecfdf5';
    }

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    const mix = (value: number) => Math.round(value + (255 - value) * 0.86);
    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  }
}