import React, { useEffect, useRef, useState } from 'react'
import { labRepo, staffRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { Button, Input, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { compressImage } from '@/lib/compressImage'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { pull } from '@/lib/pull'
import { supabase } from '@/lib/supabase'
import type { Lab, LabStaff, UserRole } from '@/types'

type Tab = 'profile' | 'staff' | 'prices' | 'notifications'

interface NotifSettings {
  whatsapp: boolean
  sms: boolean
  doctor_copy: boolean
}

const DEFAULT_NOTIF: NotifSettings = { whatsapp: true, sms: true, doctor_copy: false }

export function SettingsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { role, labId } = useAuthContext()
  const isOwner = role === 'owner'

  const [tab, setTab] = useState<Tab>('profile')
  const [lab, setLab] = useState<Lab | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    mlscn_no: '',
    pdf_footer: '',
    pdf_disclaimer: ''
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [staff, setStaff] = useState<LabStaff[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('scientist')
  const [inviting, setInviting] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF)
  const [testingNotif, setTestingNotif] = useState(false)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    const [labs, staffList] = await Promise.all([labRepo.all(), staffRepo.all()])
    const currentLab = labs[0] ?? null
    setLab(currentLab)
    if (currentLab) {
      setProfileForm({
        name: currentLab.name,
        address: currentLab.address ?? '',
        phone: currentLab.phone ?? '',
        email: currentLab.email ?? '',
        mlscn_no: currentLab.mlscn_no,
        pdf_footer: currentLab.pdf_footer,
        pdf_disclaimer: currentLab.pdf_disclaimer
      })
    }
    setStaff(staffList.filter((member) => member.is_active))

    const stored = localStorage.getItem('labora-notif-settings')
    if (stored) {
      try {
        setNotifSettings(JSON.parse(stored) as NotifSettings)
      } catch {
        setNotifSettings(DEFAULT_NOTIF)
      }
    }

    if (!navigator.onLine) return

    await Promise.all([pull.labs(), pull.staff()])

    const [freshLabs, freshStaff] = await Promise.all([labRepo.all(), staffRepo.all()])
    const freshLab = freshLabs[0] ?? null
    setLab(freshLab)
    if (freshLab) {
      setProfileForm({
        name: freshLab.name,
        address: freshLab.address ?? '',
        phone: freshLab.phone ?? '',
        email: freshLab.email ?? '',
        mlscn_no: freshLab.mlscn_no,
        pdf_footer: freshLab.pdf_footer,
        pdf_disclaimer: freshLab.pdf_disclaimer
      })
    }
    setStaff(freshStaff.filter((member) => member.is_active))
  }

  async function handleSaveProfile() {
    if (!lab) return
    if (!profileForm.name.trim() || !profileForm.mlscn_no.trim()) {
      toast.push('Lab name and MLSCN number are required', 'error')
      return
    }

    setSavingProfile(true)
    try {
      const updated: Lab = {
        ...lab,
        name: profileForm.name.trim(),
        address: profileForm.address.trim() || null,
        phone: profileForm.phone.trim() || null,
        email: profileForm.email.trim() || null,
        mlscn_no: profileForm.mlscn_no.trim(),
        pdf_footer: profileForm.pdf_footer.trim(),
        pdf_disclaimer: profileForm.pdf_disclaimer.trim(),
        updated_at: new Date().toISOString()
      }
      await labRepo.update(updated, lab)
      setLab(updated)
      toast.push(offlineSuccessMessage('Lab profile saved'))
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!lab) return
    if (!navigator.onLine) {
      toast.push('Logo upload requires an internet connection', 'error')
      return
    }

    setUploadingLogo(true)
    try {
      const compressed = await compressImage(file, 512, 200_000, 0.85)
      const ext = compressed.name.split('.').pop() ?? 'jpg'
      const path = `${lab.id}/logo.${ext}`
      const { error } = await supabase.storage.from('lab-logos').upload(path, compressed, { upsert: true })
      if (error) throw error

      const { data: urlData } = supabase.storage.from('lab-logos').getPublicUrl(path)
      const updated: Lab = { ...lab, logo_url: urlData.publicUrl, updated_at: new Date().toISOString() }
      await labRepo.update(updated, lab)
      setLab(updated)
      toast.push('Logo uploaded')
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleInviteStaff() {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.push('Email and name are required', 'error')
      return
    }
    if (!navigator.onLine) {
      toast.push('Staff invitation requires an internet connection', 'error')
      return
    }

    setInviting(true)
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail.trim())
      if (error) throw error

      const now = new Date().toISOString()
      const newStaff: LabStaff = {
        id: crypto.randomUUID(),
        user_id: data.user?.id ?? crypto.randomUUID(),
        lab_id: labId ?? '',
        role: inviteRole,
        full_name: inviteName.trim(),
        phone: null,
        two_factor_enabled: false,
        is_active: true,
        created_at: now,
        updated_at: now
      }

      await staffRepo.create(newStaff)
      setStaff((prev) => [...prev, newStaff])
      toast.push(`Invitation sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('scientist')
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setInviting(false)
    }
  }

  async function handleDeactivateStaff(member: LabStaff) {
    setDeactivating(member.id)
    try {
      const updated: LabStaff = {
        ...member,
        is_active: false,
        updated_at: new Date().toISOString()
      }
      await staffRepo.update(updated, member)
      setStaff((prev) => prev.filter((item) => item.id !== member.id))
      toast.push(offlineSuccessMessage(`${member.full_name} deactivated`))
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setDeactivating(null)
    }
  }

  function saveNotifSettings(next: NotifSettings) {
    setNotifSettings(next)
    localStorage.setItem('labora-notif-settings', JSON.stringify(next))
    toast.push('Notification preferences saved')
  }

  async function handleTestNotification() {
    if (!navigator.onLine) {
      toast.push('Requires internet connection', 'error')
      return
    }

    setTestingNotif(true)
    try {
      const { error } = await supabase.functions.invoke('send-result-notification', {
        body: { test: true }
      })
      if (error) throw error
      toast.push('Test notification sent successfully')
    } catch (err) {
      toast.push(friendlyError(err), 'error')
    } finally {
      setTestingNotif(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; ownerOnly?: boolean }> = [
    { id: 'profile', label: 'Lab Profile', ownerOnly: true },
    { id: 'staff', label: 'Staff', ownerOnly: true },
    { id: 'prices', label: 'Price List' },
    { id: 'notifications', label: 'Notifications' }
  ]

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Settings</h2>
        </div>
      </header>

      <div className="filter-row" style={{ marginBottom: 24 }}>
        {tabs.filter((item) => !item.ownerOnly || isOwner).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filter-chip${tab === item.id ? ' filter-chip--active' : ''}`}
            onClick={() => {
              if (item.id === 'prices') {
                navigate('/app/settings/prices')
              } else {
                setTab(item.id)
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && isOwner ? (
        <div style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 20 }}>
            <p className="form-label">Lab Logo</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {lab?.logo_url ? (
                <img src={lab.logo_url} alt="Lab logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  No logo
                </div>
              )}
              <div>
                <Button variant="secondary" size="sm" loading={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
                  {lab?.logo_url ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>PNG or JPG, max 2 MB</p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    void handleLogoUpload(file)
                  }
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Lab Name" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input label="MLSCN Registration Number" value={profileForm.mlscn_no} onChange={(e) => setProfileForm((prev) => ({ ...prev, mlscn_no: e.target.value }))} />
            <Input label="Address" value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} />
            <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
            <div>
              <label className="form-label">PDF Footer Text</label>
              <textarea className="form-input" rows={2} value={profileForm.pdf_footer} onChange={(e) => setProfileForm((prev) => ({ ...prev, pdf_footer: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">PDF Disclaimer</label>
              <textarea className="form-input" rows={3} value={profileForm.pdf_disclaimer} onChange={(e) => setProfileForm((prev) => ({ ...prev, pdf_disclaimer: e.target.value }))} />
            </div>
            <div style={{ marginTop: 4 }}>
              <Button variant="primary" loading={savingProfile} onClick={() => void handleSaveProfile()}>
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'staff' && isOwner ? (
        <div>
          <div style={{ maxWidth: 560, marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Invite Staff Member</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input label="Full Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Dr. Ada Okonkwo" />
              <Input label="Email Address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="staff@email.com" />
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
                  <option value="scientist">Scientist</option>
                  <option value="manager">Manager</option>
                  <option value="front_desk">Front Desk</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <Button variant="primary" loading={inviting} onClick={() => void handleInviteStaff()}>
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: 12 }}>Active Staff ({staff.length})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>2FA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {member.role.replace('_', ' ')}
                  </td>
                  <td>
                    {member.two_factor_enabled ? (
                      <span style={{ color: 'var(--color-status-success)', fontSize: 12, fontWeight: 600 }}>Enabled</span>
                    ) : (
                      <span style={{ color: 'var(--color-status-warning)', fontSize: 12 }}>Not set</span>
                    )}
                  </td>
                  <td>
                    <Button variant="secondary" size="sm" loading={deactivating === member.id} onClick={() => void handleDeactivateStaff(member)}>
                      Deactivate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <div style={{ maxWidth: 480 }}>
          <h3 style={{ marginBottom: 16 }}>Delivery Channels</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12 16', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>WhatsApp</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Primary channel — sends result link via WhatsApp Business API
                </p>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={notifSettings.whatsapp} onChange={(e) => saveNotifSettings({ ...notifSettings, whatsapp: e.target.checked })} />
                <span style={{ fontSize: 13 }}>{notifSettings.whatsapp ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12 16', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>SMS Fallback</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Termii SMS used when WhatsApp delivery fails
                </p>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={notifSettings.sms} onChange={(e) => saveNotifSettings({ ...notifSettings, sms: e.target.checked })} />
                <span style={{ fontSize: 13 }}>{notifSettings.sms ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12 16', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Doctor Copy</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Send a copy of approved results to the referring doctor
                </p>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={notifSettings.doctor_copy} onChange={(e) => saveNotifSettings({ ...notifSettings, doctor_copy: e.target.checked })} />
                <span style={{ fontSize: 13 }}>{notifSettings.doctor_copy ? 'On' : 'Off'}</span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Test Notification</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Send a test message to verify your notification pipeline is working.
            </p>
            <Button variant="secondary" loading={testingNotif} onClick={() => void handleTestNotification()}>
              Send Test Message
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
