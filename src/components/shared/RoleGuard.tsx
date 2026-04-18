import { useAuthContext } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  /** Roles that ARE allowed to see this content. */
  allow: UserRole[]
  /** Content rendered when the role check passes. */
  children: React.ReactNode
}

/**
 * Renders children only when the current user's role is in the `allow` list.
 * When the role is not permitted the component returns null — the children are
 * ABSENT FROM THE DOM, not merely hidden with CSS.
 *
 * Usage:
 *   <RoleGuard allow={['owner', 'manager']}>
 *     <RevenuePanel />
 *   </RoleGuard>
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role } = useAuthContext()
  if (!role || !allow.includes(role)) return null
  return <>{children}</>
}
