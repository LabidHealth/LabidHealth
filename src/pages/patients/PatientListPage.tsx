import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, EmptyState, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui'
import { db } from '@/lib/db'
import { formatPhone, formatTimeAgo } from '@/lib/formatters'
import { Users, Search } from 'lucide-react'

type Filter = 'today' | 'week' | 'all'

export function PatientListPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const perPage = 25
  const navigate = useNavigate()

  useEffect(() => {
    db.patients.toArray().then(setPatients)
  }, [])

  const filtered = useMemo(() => {
    const base = patients.filter((patient) => {
      if (!search) return true
      const lower = search.toLowerCase()
      return (
        patient.full_name.toLowerCase().includes(lower) ||
        patient.lapid.toLowerCase().includes(lower) ||
        patient.phone.includes(lower)
      )
    })

    if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return base.filter((patient) => new Date(patient.created_at) >= today)
    }
    if (filter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return base.filter((patient) => new Date(patient.created_at) >= weekAgo)
    }
    return base
  }, [patients, search, filter])

  const currentPage = filtered.slice(page * perPage, page * perPage + perPage)
  const pageCount = Math.ceil(filtered.length / perPage)

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
              placeholder="Search by name, phone, LAPID"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button variant="primary" icon={<Users />} onClick={() => navigate('/app/patients/register')}>
            Register Patient
          </Button>
        </div>
      </header>
      <div className="filter-row">
        {(['today', 'week', 'all'] as Filter[]).map((value) => (
          <button
            key={value}
            className={`filter-chip${filter === value ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value === 'today' ? 'Today' : value === 'week' ? 'This Week' : 'All Time'}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="🙋"
          headline="No patients yet"
          description="Register the first patient to get started."
          cta={<Button variant="primary" onClick={() => navigate('/app/patients/register')}>Register first patient</Button>}
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th>Patient</th>
              <th>Phone</th>
              <th>Last visit</th>
              <th>Visits</th>
              <th>Consent</th>
              <th>Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {currentPage.map((patient) => (
              <TableRow key={patient.id} onClick={() => navigate(`/app/patients/${patient.id}`)}>
                <TableCell>
                  <strong>{patient.full_name}</strong>
                  <div className="table-id">{patient.lapid}</div>
                </TableCell>
                <TableCell>{formatPhone(patient.phone)}</TableCell>
                <TableCell>{formatTimeAgo(patient.updated_at)}</TableCell>
                <TableCell>{patient.visit_count ?? 1}</TableCell>
                <TableCell>{patient.consent ? '✓' : '✗'}</TableCell>
                <TableCell className="table-actions">View</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="pagination-row">
        <Button variant="secondary" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
          Previous
        </Button>
        <span>{page + 1} / {pageCount || 1}</span>
        <Button variant="secondary" disabled={page >= pageCount - 1} onClick={() => setPage((prev) => prev + 1)}>
          Next
        </Button>
      </div>
    </section>
  )
}
