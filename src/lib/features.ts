/**
 * Runtime workflow toggles for the Labid Health MVP.
 *
 * Deferred scope (printed QR labels, camera scanning, inventory) is not
 * flagged — it has been removed from the codebase entirely and lives only in
 * git history. These flags configure genuine MVP runtime behaviour
 * (see docs/labidhealth/mvp-spec.md §10) and are wired up in later build phases.
 */
export const features = {
  approvalStep: false, // off = scientist enters → delivers directly
  aiExplanation: true, // patient-facing plain-language explanation
  doctorNotify: true, // notify referring doctor on result delivery
  deliveryPaymentGate: true // hold delivery until invoice settled
} as const

export type FeatureFlag = keyof typeof features

export function isEnabled(flag: FeatureFlag): boolean {
  return features[flag]
}
