# Labora AI Launch Checklist

This checklist covers all items that must be completed before production launch.

## Security & Compliance

### Secrets Management
- [ ] Verify no hardcoded secrets in frontend code
- [ ] Ensure all environment variables are set in Supabase dashboard:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - [ ] `WHATSAPP_APP_SECRET`
  - [ ] `JWT_SECRET` (for result link signing)
- [ ] Rotate any test/development secrets before production
- [ ] Enable Supabase Row Level Security on all tables
- [ ] Verify RLS policies prevent unauthorized access

### Security Audit
- [ ] Run `npm audit` and fix high/critical vulnerabilities
- [ ] Update all dependencies to latest secure versions
- [ ] Review Edge Functions for security vulnerabilities
- [ ] Ensure HTTPS is enforced on all endpoints
- [ ] Verify CORS settings are restrictive

### Data Protection
- [ ] Confirm patient consent is captured before any data entry
- [ ] Verify audit logging is enabled for all data modifications
- [ ] Test data export functionality (CSV export from audit log)
- [ ] Verify data retention policies are documented

## Authentication & Authorization
- [ ] Test 2FA enforcement for owner/manager roles
- [ ] Verify role-based access control (RBAC) on all pages
- [ ] Test session timeout and re-authentication
- [ ] Verify password reset flow (if implemented)
- [ ] Test sign-out clears all local data

## Core Functionality

### Patient Management
- [ ] Test patient registration with duplicate detection
- [ ] Verify patient search works correctly
- [ ] Test LAPID card printing (credit card size)
- [ ] Verify consent history tracking (owner view)
- [ ] Test patient visit recording

### Sample Management
- [ ] Test sample registration with QR label generation
- [ ] Verify sample status transitions work correctly
- [ ] Test QR label printing (1/2/4 per A5 sheet)
- [ ] Verify sample rejection workflow
- [ ] Test QR scanner for sample lookup

### Result Management
- [ ] Test result entry with out-of-range highlighting
- [ ] Verify reference ranges display correctly
- [ ] Test critical value acknowledgment flow
- [ ] Verify result approval workflow (scientist → manager)
- [ ] Test result PDF generation and printing
- [ ] Verify result amendment reopening

### Billing & Invoicing
- [ ] Test invoice generation on sample registration
- [ ] Verify payment recording updates invoice status
- [ ] Test receipt printing (80mm thermal)
- [ ] Verify daily summary report generation
- [ ] Test revenue calculations

### Notification System
- [ ] Test WhatsApp notification delivery
- [ ] Verify SMS fallback works when WhatsApp fails
- [ ] Test delivery receipt webhook processing
- [ ] Verify notification status updates in real-time
- [ ] Test 24h failure check for undelivered notifications

### Search & Navigation
- [ ] Test global search (Cmd+K shortcut)
- [ ] Verify search results display correctly
- [ ] Test navigation from search results
- [ ] Verify recent searches are stored

## Print Functionality
- [ ] Test result PDF print button
- [ ] Verify receipt print (80mm thermal)
- [ ] Test sample QR label print (1/2/4 per sheet)
- [ ] Verify LAPID card print (credit card size)
- [ ] Test daily summary print for lab manager

## Offline & Sync
- [ ] Test offline mode - verify app works without internet
- [ ] Verify sync queue shows pending changes
- [ ] Test automatic sync when connection restored
- [ ] Verify conflict detection and resolution
- [ ] Test offline success messages

## Responsive Design
- [ ] Test on 768px tablet breakpoint
- [ ] Test on 390px phone breakpoint
- [ ] Verify bottom navigation on mobile
- [ ] Test touch targets are 44px minimum
- [ ] Verify text sizes are readable on mobile
- [ ] Test in both portrait and landscape orientations

## Performance
- [ ] Run Lighthouse audit and meet targets:
  - [ ] Performance score > 90
  - [ ] Accessibility score > 90
  - [ ] Best Practices score > 90
  - [ ] SEO score > 90
- [ ] Verify lazy loading of routes works
- [ ] Test with slow 3G network
- [ ] Verify large PDFs don't block UI

## Edge Functions
- [ ] Deploy all Edge Functions to production:
  - [ ] `whatsapp-webhook`
  - [ ] `send-result-notification`
  - [ ] `check-undelivered-notifications`
  - [ ] `generate-result-link`
  - [ ] `verify-result`
- [ ] Set up cron job for `check-undelivered-notifications` (every 24h)
- [ ] Verify webhook signature verification works
- [ ] Test Edge Function error handling

## Database
- [ ] Run all pending migrations
- [ ] Verify indexes are created for performance
- [ ] Test database connection from production environment
- [ ] Verify foreign key constraints work correctly
- [ ] Test backup/restore procedures

## Public Pages
- [ ] Test public ResultViewPage with valid JWT token
- [ ] Test token expiration handling
- [ ] Verify invalid tokens are rejected
- [ ] Test VerifyResultPage for QR code verification
- [ ] Verify result links work in incognito mode

## Testing
- [ ] Install and configure Playwright
- [ ] Write E2E tests for critical journeys:
  - [ ] Patient registration
  - [ ] Sample registration and labeling
  - [ ] Result entry and approval
  - [ ] Invoice generation and payment
  - [ ] Notification delivery
  - [ ] Offline sync
  - [ ] Global search
  - [ ] QR code scanning
- [ ] Run all tests and ensure they pass

## Monitoring & Logging
- [ ] Set up error tracking (Sentry or similar)
- [ ] Verify audit log is recording all changes
- [ ] Test audit log export functionality
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical failures

## Documentation
- [ ] Update README with production deployment instructions
- [ ] Document environment variables
- [ ] Create operations runbook
- [ ] Document rollback procedures
- [ ] Document emergency contact procedures

## Legal & Compliance
- [ ] Verify privacy policy is in place
- [ ] Ensure terms of service are displayed
- [ ] Verify consent language is legally compliant
- [ ] Document data retention policy
- [ ] Verify GDPR/Nigerian data protection compliance

## Pre-Launch Final Checks
- [ ] Full regression test of all features
- [ ] Load test with realistic traffic
- [ ] Verify backup procedures work
- [ ] Test disaster recovery procedures
- [ ] Get sign-off from stakeholders
- [ ] Schedule production deployment window
- [ ] Prepare rollback plan

## Post-Launch
- [ ] Monitor system for 24-48 hours
- [ ] Address any critical issues immediately
- [ ] Collect user feedback
- [ ] Plan iteration based on feedback
