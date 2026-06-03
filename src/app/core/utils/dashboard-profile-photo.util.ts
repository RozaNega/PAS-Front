import { WritableSignal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { CurrentUserService } from '../services/current-user.service';

/** Sync profile photo signal when global user state changes. */
export function initDashboardProfilePhoto(
  currentUserService: CurrentUserService,
  sanitizer: DomSanitizer,
  profilePhoto: WritableSignal<SafeUrl | string | null>,
): Subscription {
  currentUserService.hydrateFromStorage();

  const apply = (): void => {
    const url = currentUserService.getProfileImageUrl();
    profilePhoto.set(
      url ? sanitizer.bypassSecurityTrustUrl(currentUserService.getDisplayUrl(url)) : null,
    );
  };

  apply();

  return currentUserService.profileImageUrl$.subscribe(() => apply());
}
