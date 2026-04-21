import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type LayoutMenuMode = 'static' | 'overlay';

type LayoutConfig = {
  menuMode: LayoutMenuMode;
};

type LayoutState = {
  staticMenuDesktopInactive: boolean;
  overlayMenuActive: boolean;
  mobileMenuActive: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class LayoutShellService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly layoutConfig = signal<LayoutConfig>({
    menuMode: 'static',
  });

  readonly layoutState = signal<LayoutState>({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    mobileMenuActive: false,
  });

  readonly isOverlayMode = computed(() => this.layoutConfig().menuMode === 'overlay');

  readonly isSidebarActive = computed(
    () => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive,
  );

  readonly isSidebarOpen = computed(() => {
    if (this.isDesktop()) {
      if (this.isOverlayMode()) {
        return this.layoutState().overlayMenuActive;
      }

      return !this.layoutState().staticMenuDesktopInactive;
    }

    return this.layoutState().mobileMenuActive;
  });

  initialize(): void {
    if (!this.isDesktop()) {
      this.layoutState.update((state) => ({
        ...state,
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        mobileMenuActive: false,
      }));
    }
  }

  onMenuToggle(): void {
    if (this.isOverlayMode() && this.isDesktop()) {
      this.layoutState.update((state) => ({
        ...state,
        overlayMenuActive: !state.overlayMenuActive,
      }));
      return;
    }

    if (this.isDesktop()) {
      this.layoutState.update((state) => ({
        ...state,
        staticMenuDesktopInactive: !state.staticMenuDesktopInactive,
      }));
      return;
    }

    this.layoutState.update((state) => ({
      ...state,
      mobileMenuActive: !state.mobileMenuActive,
    }));
  }

  closeMenu(): void {
    this.layoutState.update((state) => ({
      ...state,
      overlayMenuActive: false,
      mobileMenuActive: false,
    }));
  }

  isDesktop(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    return window.innerWidth > 1024;
  }
}
