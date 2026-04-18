import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layout, Activity, FileText, Box, DollarSign, Settings } from 'lucide-react'

const navItems = [
  { path: '/app', icon: Layout, label: 'Home' },
  { path: '/app/samples', icon: Activity, label: 'Samples' },
  { path: '/app/results', icon: FileText, label: 'Results' },
  { path: '/app/billing', icon: DollarSign, label: 'Billing' },
  { path: '/app/settings', icon: Settings, label: 'Settings' }
]

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        
        return (
          <button
            key={item.path}
            type="button"
            className={`nav-item nav-item--compact${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
