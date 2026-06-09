import { Directive, TemplateRef, ViewContainerRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appBrowserOnly]',
  standalone: true,
})
export class BrowserOnlyDirective {
  constructor() {
    const platformId = inject(PLATFORM_ID);
    const templateRef = inject(TemplateRef);
    const viewContainer = inject(ViewContainerRef);
    if (isPlatformBrowser(platformId)) {
      viewContainer.createEmbeddedView(templateRef);
    }
  }
}
