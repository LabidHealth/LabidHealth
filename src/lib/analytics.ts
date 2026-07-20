// Analytics + error monitoring — PostHog (product) + Sentry (errors).
//
// Dormant by default: nothing loads or sends until VITE_POSTHOG_KEY /
// VITE_SENTRY_DSN are set, so dev and un-instrumented builds ship neither SDK
// (both are dynamically imported only when their key is present).
//
// NDPA / privacy: this is a health app. Events carry ONLY non-identifying
// fields — role, durations, counts, channel, method, success flags. NEVER pass
// a patient name, phone, LABID, or result value into track()/identify(). We
// identify by auth user id (a UUID) + role + lab, disable autocapture and
// session recording, and set sendDefaultPii:false on Sentry.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const ENVIRONMENT = (import.meta.env.MODE as string | undefined) ?? 'production'

export type AnalyticsEvent =
  | 'patient_registered'
  | 'sample_registered'
  | 'result_entered'
  | 'result_approved'
  | 'result_delivered'
  | 'payment_recorded'
  | 'ai_explanation_requested'

type Props = Record<string, string | number | boolean | null | undefined>

// Loaded SDK handles (null until the matching key activates them).
let posthog: typeof import('posthog-js').default | null = null
let sentry: typeof import('@sentry/react') | null = null

/** Initialise whichever providers are configured. Safe to call once at startup. */
export async function initAnalytics(): Promise<void> {
  if (POSTHOG_KEY && !posthog) {
    try {
      const mod = await import('posthog-js')
      mod.default.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        autocapture: false, // no DOM scraping — avoids capturing PII in inputs
        disable_session_recording: true,
        person_profiles: 'identified_only'
      })
      posthog = mod.default
    } catch (err) {
      console.warn('[analytics] PostHog init failed', err)
    }
  }

  if (SENTRY_DSN && !sentry) {
    try {
      const mod = await import('@sentry/react')
      mod.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        sendDefaultPii: false,
        tracesSampleRate: 0.1
      })
      sentry = mod
    } catch (err) {
      console.warn('[analytics] Sentry init failed', err)
    }
  }
}

/** Tie subsequent events to a lab user. Id is the auth UUID — never a name. */
export function identify(userId: string, role: string, labId: string | null): void {
  posthog?.identify(userId, { role, lab_id: labId ?? undefined })
  sentry?.setUser({ id: userId })
  sentry?.setTag('role', role)
}

/** Clear identity on sign-out. */
export function resetAnalytics(): void {
  posthog?.reset()
  sentry?.setUser(null)
}

/** Record a product event. Callers must pass only non-PII props (see header). */
export function track(event: AnalyticsEvent, props?: Props): void {
  posthog?.capture(event, props)
}

/** Report an unexpected error to Sentry. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined)
}
