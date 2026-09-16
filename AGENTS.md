# Session Summary — Jul 09, 2026

## Fixes Applied

### 1. Identity GUID Error on User List
- **File:** `src/app/features/user-management/pages/user-list/user-list.component.ts:682`
- **Change:** `sendNotification()` now silently skips when a user has no Identity GUID instead of showing a hard error.

### 2. SMTP Email Fallback
- **File:** `email-service.mjs:63-86`
- **Change:** `sendEmail()` falls back to `console.log` on SMTP failure instead of throwing.
- **File:** `email-service.mjs:469-503`
- **Change:** Forgot-password endpoint now `await`s the email send and returns a clear message when SMTP is unavailable.
- **Note:** SMTP user `k44144202@gmail.com` with app password `iehvtnonfyyyfkeh` is rejected by Google (error 534-5.7.9). User must generate a new app password at https://myaccount.google.com/security and update `.env`.

### 3. Disposal Page Refresh Button
- **File:** `src/app/features/store-inventory/disposal/pages/disposal.component.ts`
- **Change:** `ngOnInit()` now calls `loadItemMasterItems()`. `submitDisposal()` calls `loadItemMasterItems()` after success. Refresh button calls both `loadHistory()` and `loadItemMasterItems()`.

### 4. Storekeeper Dashboard Disposal Items
- **File:** `src/app/features/dashboard/pages/storekeeper/storekeeper-dashboard.component.ts`
- **Change:** `loadSectionData()` includes `loadDisposalData()`. `submitDisposal()` also calls `loadDashboardData()` and `loadDisposalStock()` after success.

### 5. Unassigned Users Role Dropdown
- **File:** `src/app/features/user-management/pages/roles-permissions/roles-permissions.component.html:63`
- **Change:** Outer `@if` condition changed from `expandedUser() === -1` to `expandedUser() !== null` so clicking an individual user inside the expanded dropdown doesn't close it.

### 6. Manager Dashboard Sidebar Inventory Links
- **File:** `src/app/app.routes.ts`
- **Change:** Removed redundant `canActivate: [AuthGuard]` from child routes `/manager/inventory`, `/manager/inventory/low-stock`, `/manager/inventory/movements`, `/manager/inventory/ledger`, and `/manager/reports`. The parent `/manager` route already has the guard, so children inherit its protection. Other child routes (dashboard, notifications, approvals, etc.) never had individual guards and worked fine.

### 7. Stock Overview Page — "No refresh token available" Error
- **File:** `src/app/core/services/inventory.service.ts:269-278`
- **Change:** Added `catchError` to `getStockMovements()` so a backend/refresh failure returns an empty fallback instead of crashing the `forkJoin` in the stock overview page.
- **File:** `src/app/core/interceptors/auth.interceptor.ts:50-53`
- **Change:** When no refresh token is available, the interceptor now returns a proper 401 `HttpErrorResponse` instead of an `Error` with message "No refresh token available". Also added `catchError` to the concurrent-request queue path so those requests also get a clean 401 rather than hanging forever.
- **File:** `dev-api-server.mjs:251-265`
- **Change:** `/api/StockLedger` endpoint now wraps the ledger array in a paginated response shape (`{ items, totalCount, pageNumber, ... }`) matching `PaginatedStockLedgerResponse` that the frontend's `StockLedgerService.getAll()` expects.

### 8. Disposal Notifications Not Appearing on Admin Dashboard
- **File:** `src/app/features/store-inventory/disposal/pages/disposal.component.ts:209`
- **Change:** After successful disposal creation, now calls `workflowService.createNotification()` to create an actual in-app notification with `recipientRole: 'Manager'` (was just showing a fake "Admin has been notified" message without actually creating any notification).
- **File:** `src/app/features/dashboard/pages/storekeeper/storekeeper-dashboard.component.ts:411`
- **Change:** Same fix — `submitDisposal()` now calls `workflowService.createNotification()` after success.
- **File:** `email-service.mjs:1995`
- **Change:** Backend `POST /api/DisposalRecords` now calls `addNotification()` to persist a server-side notification in the in-memory store, so the notification sidebar (which fetches from the backend API) displays it for all users.

### 9. Color Picker Not Working on Login/Signup
- **File:** `src/app/features/auth/shared/auth-styles.css:2`
- **Change:** Removed `--auth-primary: #1b4ea5` from the `:host` block. This hardcoded default was overriding the dynamic `--auth-primary` that the color-picker swatches set on the `.auth-sakai` parent element. Since `app-login`/`app-register` re-declared the variable on their `:host`, the inherited value from `.auth-sakai` was blocked. After removal, `var(--auth-primary)` references throughout the file correctly inherit the user-selected color from the parent.
