import React, { useEffect, useState } from 'react'
import { Filter, Download } from 'lucide-react'
import { Badge, Button, EmptyState, Input, useToast } from '@/components/ui'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { useAuthContext } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/formatters'

interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string | null
  user_role: string | null
  lab_id: string | null
  old_record: any
  new_record: any
  changed_fields: string[] | null
  created_at: string
}

export function AuditLogPage() {
  const { user } = useAuthContext()
  const toast = useToast()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTable, setFilterTable] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')

  useEffect(() => {
    loadAuditLogs()
  }, [])

  async function loadAuditLogs() {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      toast.push('Failed to load audit logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filterTable && !log.table_name.toLowerCase().includes(filterTable.toLowerCase())) return false
    if (filterAction && log.action !== filterAction) return false
    if (filterUser && !log.user_role?.toLowerCase().includes(filterUser.toLowerCase())) return false
    return true
  })

  function getActionBadge(action: string) {
    const colors = {
      INSERT: 'success' as const,
      UPDATE: 'warning' as const,
      DELETE: 'info' as const
    }
    return <Badge status={colors[action as keyof typeof colors] || 'info'}>{action}</Badge>
  }

  function getChangedFieldsCount(log: AuditLogEntry): number {
    if (log.action === 'DELETE') return 1
    if (log.action === 'INSERT') return Object.keys(log.new_record || {}).length
    return log.changed_fields?.length || 0
  }

  async function exportLogs() {
    try {
      const csv = [
        ['Date', 'Table', 'Action', 'User Role', 'Record ID', 'Changed Fields'].join(','),
        ...filteredLogs.map((log) =>
          [
            new Date(log.created_at).toISOString(),
            log.table_name,
            log.action,
            log.user_role || '—',
            log.record_id,
            getChangedFieldsCount(log)
          ].join(',')
        )
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.push('Audit log exported successfully')
    } catch (err) {
      toast.push('Failed to export audit log', 'error')
    }
  }

  return (
    <RoleGuard allow={['owner']}>
      <div className="detail-page">
        <header className="detail-header">
          <div>
            <h1>Audit Log</h1>
            <p className="list-subtitle">Track all data modifications (owner only)</p>
          </div>
          <Button variant="secondary" onClick={exportLogs}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export CSV
          </Button>
        </header>

        <div className="detail-card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input
                placeholder="Filter by table..."
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
              />
            </div>
            <div style={{ width: 150 }}>
              <select
                className="form-input"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input
                placeholder="Filter by user role..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={<Filter size={48} />}
              headline="No audit logs found"
              description="Try adjusting your filters or check back later."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Table</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Record ID</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 13 }}>{formatDateTime(log.created_at)}</td>
                      <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{log.table_name}</td>
                      <td>{getActionBadge(log.action)}</td>
                      <td style={{ fontSize: 13 }}>{log.user_role || '—'}</td>
                      <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{log.record_id.slice(0, 8)}...</td>
                      <td style={{ fontSize: 13 }}>{getChangedFieldsCount(log)} field{getChangedFieldsCount(log) !== 1 ? 's' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
