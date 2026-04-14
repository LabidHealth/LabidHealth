import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  CreditCard,
  FlaskConical,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users
} from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'

const navItems = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Patients', path: '/app/patients', icon: Users },
  { label: 'Sample Tracking', path: '/app/samples', icon: FlaskConical },
  { label: 'Results', path: '/app/results', icon: FileText },
  { label: 'Billing', path: '/app/billing', icon: CreditCard, hideFor: ['scientist'] },
  { label: 'Inventory', path: '/app/inventory', icon: Package, hideFor: ['front_desk'] },
  { label: 'Reports', path: '/app/reports', icon: BarChart2 },
  { label: 'Settings', path: '/app/settings', icon: Settings }
]

export function Sidebar() {
  const { role, signOut } = useAuthContext()

  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <p className="sidebar__brand-title">Labora AI</p>
        <p className="sidebar__brand-meta">Digital lab OS</p>
      </div>
      <div className="sidebar__nav">
        {navItems
          .filter((item) => !(item.hideFor?.includes(role ?? '') ?? false))
          .map((item) => (
            <NavLink key={item.path} to={item.path} className="nav-item">
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
      </div>
      <div className="sidebar__footer">
        <button type="button" className="nav-item" onClick={() => window.open('mailto:support@labora.ai')}>
          <HelpCircle />
          <span>Support</span>
        </button>
        <button type="button" className="nav-item" onClick={signOut}>
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
