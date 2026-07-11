import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResultApprovalPage } from './ResultApprovalPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  push: vi.fn(),
  resultGet: vi.fn(),
  patientFirst: vi.fn(),
  sampleFirst: vi.fn(),
  labGet: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ resultId: 'result-1' })
}))

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1' },
    role: 'owner',
    labId: 'lab-1'
  })
}))

vi.mock('@/lib/db', () => ({
  db: {
    results: { get: mocks.resultGet },
    patients: {
      where: () => ({
        equals: () => ({
          first: mocks.patientFirst
        })
      })
    },
    samples: {
      where: () => ({
        equals: () => ({
          first: mocks.sampleFirst
        })
      })
    },
    labs: { get: mocks.labGet }
  }
}))

vi.mock('@/lib/writeRecord', () => ({
  writeRecord: vi.fn()
}))

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  EmptyState: ({ headline, description, cta }: { headline: string; description: string; cta?: React.ReactNode }) => (
    <div>
      <h1>{headline}</h1>
      <p>{description}</p>
      {cta}
    </div>
  ),
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label ?? ''}
      <input {...props} />
    </label>
  ),
  Modal: ({ open, title, children, footer }: { open: boolean; title: string; children: React.ReactNode; footer?: React.ReactNode }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
  useToast: () => ({ push: mocks.push })
}))

describe('ResultApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resultGet.mockResolvedValue({
      id: 'result-1',
      sample_id: 'sample-1',
      labid: 'LB-2026-00001',
      lab_id: 'lab-1',
      test_type: 'FBC',
      parameters: {},
      comments: null,
      status: 'awaiting_approval',
      entered_by: 'user-1',
      approved_by: null,
      approved_at: null,
      pdf_url: null,
      pdf_generated_at: null,
      critical_acknowledged: false,
      critical_acknowledged_by: null,
      critical_acknowledged_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })
    mocks.patientFirst.mockResolvedValue({
      id: 'patient-1',
      labid: 'LB-2026-00001',
      full_name: 'Ada Lovelace',
      phone: '08000000000',
      consent: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })
    mocks.sampleFirst.mockResolvedValue({
      id: 'sample-row',
      sample_id: 'sample-1',
      labid: 'LB-2026-00001',
      lab_id: 'lab-1',
      status: 'awaiting_approval',
      is_stat: false,
      tests_ordered: ['FBC'],
      referring_doctor: 'Dr. Test',
      collected_at: '2026-01-01T00:00:00.000Z',
      collected_by: null,
      rejection_reason: null,
      notes: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })
    mocks.labGet.mockResolvedValue({
      id: 'lab-1',
      name: 'Labid',
      mlscn_no: '1234',
      pdf_footer: '',
      pdf_disclaimer: '',
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })
  })

  it('hides the approve button when the approver entered the result', async () => {
    render(<ResultApprovalPage />)

    await waitFor(() => {
      expect(screen.getByText(/result approval/i)).toBeTruthy()
    })

    expect(screen.getByText(/a different manager or owner must approve it/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /approve & generate pdf/i })).toBeNull()
  })
})
