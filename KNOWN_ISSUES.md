# Known Issues

## Offline / Sync

1. Approving a result while offline saves the approval locally, but the PDF upload is deferred until the device is back online.
2. If the same record is edited on two devices while both are offline, the last synced update wins.
3. Sync queue items stop retrying after 5 failed attempts to avoid infinite loops; the local IndexedDB record remains intact.

## Mobile / PWA

1. QR scanning requires HTTPS because browser camera APIs are blocked on insecure origins.
2. Some Android browsers may not show the install prompt immediately; opening the overflow menu and choosing `Add to Home Screen` still works.

## Authentication

1. Two-factor status in the staff table is mirrored into `lab_staff.two_factor_enabled` after a successful TOTP verification. Existing MFA-enabled users who enrolled before this field was introduced may display `Not set` until they sign in and complete MFA once.
