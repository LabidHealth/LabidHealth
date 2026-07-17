import React, { useEffect, useMemo, useState } from 'react'
import { patientRepo, visitRepo } from '@/lib/repositories'
import { MoreVertical, Search, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Avatar, Button, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui'
import { formatPhone, formatTimeAgo } from '@/lib/formatters'
import { openAndPrintPdfBlob } from '@/lib/printPdf'
import { buildPatientSearchValue, getNameSimilarity } from '@/lib/patientSearch'
import { pull } from '@/lib/pull'
import type { Patient, PatientVisit } from '@/types'

type Filter = 'today' | 'week' | 'all'

interface PatientRow {
  patient: Patient
  totalVisits: number
  lastVisit: string
  searchValue: string
}

async function syncPatientsFromSupabase() {
  await Promise.all([pull.patients(), pull.visits()])
}

function buildRows(patients: Patient[], visits: PatientVisit[]) {
  const visitsByLabid = visits.reduce<Record<string, PatientVisit[]>>((accumulator, visit) => {
    accumulator[visit.labid] = [...(accumulator[visit.labid] ?? []), visit]
    return accumulator
  }, {})

  return patients.map((patient) => {
    const patientVisits = visitsByLabid[patient.labid] ?? []
    const lastVisit = patientVisits
      .sort((left, right) => new Date(right.visited_at).getTime() - new Date(left.visited_at).getTime())[0]
      ?.visited_at ?? patient.updated_at

    return {
      patient,
      totalVisits: patientVisits.length || 1,
      lastVisit,
      searchValue: buildPatientSearchValue(patient)
    }
  })
}

export function PatientListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<PatientRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const perPage = 25

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const refreshLocal = async () => {
        const [patients, visits] = await Promise.all([patientRepo.all(), visitRepo.all()])
        if (mounted) setRows(buildRows(patients, visits))
      }

      await refreshLocal()

      if (navigator.onLine) {
        await syncPatientsFromSupabase()
        await refreshLocal()
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase()
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    return rows.filter((row) => {
      const createdAt = new Date(row.patient.created_at)
      const matchesDate =
        filter === 'today' ? createdAt >= todayStart : filter === 'week' ? createdAt >= weekStart : true

      if (!matchesDate) return false
      if (!loweredSearch) return true

      if (row.searchValue.includes(loweredSearch)) return true
      return getNameSimilarity(row.patient.full_name, loweredSearch) >= 0.7
    })
  }, [filter, rows, search])

  useEffect(() => {
    setPage(0)
  }, [filter, search])

  const currentPage = filtered.slice(page * perPage, page * perPage + perPage)
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))

  async function handlePrintLabidCard(patient: Patient) {
    const qrDataUrl = await QRCode.toDataURL(patient.labid, { margin: 1, width: 256 })
    const [{ pdf }, { LabidCardPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/LabidCardPDF')
    ])
    const blob = await pdf(
      <LabidCardPDF patientName={patient.full_name} labid={patient.labid} qrDataUrl={qrDataUrl} />
    ).toBlob()
    await openAndPrintPdfBlob(blob)
  }

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Patients</h2>
          <p className="list-subtitle">{filtered.length} patients registered</p>
        </div>

        <div className="list-actions">
          <div className="search-field">
            <Search className="header-icon" />
            <Input
              className="search-input"
              value={search}
              placeholder="Search by name, phone, LABID"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button variant="primary" icon={<UserPlus />} onClick={() => navigate('/app/patients/register')}>
            Register Patient
          </Button>
        </div>
      </header>

      <div className="filter-row">
        {(['today', 'week', 'all'] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`filter-chip${filter === value ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value === 'today' ? 'Today' : value === 'week' ? 'This Week' : 'All Time'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          headline="No patients yet"
          description="Register the first patient to get started."
          cta={
            <Button variant="primary" onClick={() => navigate('/app/patients/register')}>
              Register first patient
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th>Patient</th>
              <th>Phone</th>
              <th>Last Visit</th>
              <th>Total Visits</th>
              <th>Consent</th>
              <th>Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {currentPage.map((row) => (
              <TableRow key={row.patient.id} onClick={() => navigate(`/app/patients/${row.patient.id}`)}>
                <TableCell>
                  <div className="patient-cell">
                    <Avatar name={row.patient.full_name} src={row.patient.photo_url} />
                    <div>
                      <strong>{row.patient.full_name}</strong>
                      <div className="table-id">{row.patient.labid}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatPhone(row.patient.phone)}</TableCell>
                <TableCell>{formatTimeAgo(row.lastVisit)}</TableCell>
                <TableCell>{row.totalVisits}</TableCell>
                <TableCell>{row.patient.consent ? 'Yes' : 'No'}</TableCell>
                <TableCell className="table-actions">
                  <div className="action-menu" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="action-menu__trigger"
                      aria-label={`Open actions for ${row.patient.full_name}`}
                      onClick={() => setOpenMenu((current) => (current === row.patient.id ? null : row.patient.id))}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === row.patient.id ? (
                      <div className="action-menu__panel">
                        <button type="button" onClick={() => navigate(`/app/patients/${row.patient.id}`)}>View</button>
                        <button type="button" onClick={() => navigate(`/app/patients/${row.patient.id}?mode=edit`)}>Edit</button>
                        <button type="button" onClick={() => void handlePrintLabidCard(row.patient)}>Print LABID card</button>
                      </div>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="pagination-row">
        <Button variant="secondary" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
          Previous
        </Button>
        <span>{page + 1} / {pageCount}</span>
        <Button variant="secondary" disabled={page >= pageCount - 1} onClick={() => setPage((prev) => prev + 1)}>
          Next
        </Button>
      </div>
    </section>
  )
}
