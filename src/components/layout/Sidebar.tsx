import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  CreditCard,
  FlaskConical,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Users
} from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  hideFor?: UserRole[]
  mobile?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, mobile: true },
  { label: 'Patients', path: '/app/patients', icon: Users, mobile: true },
  { label: 'Sample Tracking', path: '/app/samples', icon: FlaskConical, mobile: true },
  { label: 'Results', path: '/app/results', icon: FileText, hideFor: ['front_desk'], mobile: true },
  { label: 'Billing', path: '/app/billing', icon: CreditCard, hideFor: ['manager', 'scientist'], mobile: true },
  { label: 'Reports', path: '/app/reports', icon: BarChart2, hideFor: ['front_desk', 'scientist'] },
  { label: 'Settings', path: '/app/settings', icon: Settings, hideFor: ['front_desk', 'scientist'] }
]

function NavItems({ items, compact = false }: { items: NavItem[]; compact?: boolean }) {
  return (
    <>
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} className={`nav-item${compact ? ' nav-item--compact' : ''}`}>
          <item.icon />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

export function Sidebar() {
  const { role, labId, signOut } = useAuthContext()
  const visibleItems = useMemo(
    () => navItems.filter((item) => !(item.hideFor?.includes(role ?? 'owner') ?? false)),
    [role]
  )
  const mobileItems = visibleItems.filter((item) => item.mobile).slice(0, 5)

  return (
    <>
      <nav className="sidebar" aria-label="Primary">
        <div className="sidebar__brand">
          <p className="sidebar__brand-title">Labid Health</p>
          <p className="sidebar__brand-meta">{labId ? `LAB ${labId.slice(0, 8).toUpperCase()}` : 'ACTIVE LAB'}</p>
        </div>
        <div className="sidebar__nav">
          <NavItems items={visibleItems} />
        </div>
        <div className="sidebar__footer">
          <button type="button" className="nav-item" onClick={() => window.open('mailto:support@labidhealth.com', '_blank')}>
            <HelpCircle />
            <span>Support</span>
          </button>
          <button type="button" className="nav-item" onClick={() => void signOut()}>
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
      </nav>
      <nav className="mobile-nav" aria-label="Mobile primary">
        <NavItems items={mobileItems} compact />
      </nav>
    </>
  )
}
