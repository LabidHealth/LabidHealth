import React, { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, PhoneInput, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { findPotentialDuplicate, type DuplicateCandidate } from '@/lib/patientSearch'
import { generateLocalLapid } from '@/lib/lapid'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'

interface FormValues {
  full_name: string
  date_of_birth?: string
  gender: 'male' | 'female' | 'other'
  phone: string
  address?: string
  next_of_kin?: string
  next_of_kin_phone?: string
  consent: boolean
  photo_url?: string | null
}

export function RegisterPatientPage() {
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: { gender: 'male', consent: false, photo_url: null }
  })
  const { labId, user } = useAuthContext()
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState<FormValues | null>(null)
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null)

  const values = watch()

  async function createPatientRecord(data: FormValues) {
    let lapid: string
    if (navigator.onLine) {
      const { data: lapidResponse, error: lapidError } = await supabase.rpc('generate_lapid')
      if (lapidError) {
        lapid = await generateLocalLapid()
      } else {
        lapid = (lapidResponse as string) ?? (await generateLocalLapid())
      }
    } else {
      lapid = await generateLocalLapid()
    }

    const now = new Date().toISOString()
    const patientId = crypto.randomUUID()

    await writeRecord('patients', 'INSERT', {
      id: patientId,
      lapid,
      full_name: data.full_name.trim(),
      date_of_birth: data.date_of_birth || null,
      gender: data.gender,
      phone: data.phone,
      address: data.address || null,
      next_of_kin: data.next_of_kin || null,
      next_of_kin_phone: data.next_of_kin_phone || null,
      photo_url: data.photo_url || null,
      consent: data.consent,
      consent_date: now,
      created_at: now,
      updated_at: now
    })

    if (labId) {
      await writeRecord('patient_visits', 'INSERT', {
        id: crypto.randomUUID(),
        lapid,
        lab_id: labId,
        visited_at: now,
        created_by: user?.id ?? null
      })
    }

    toast.push(offlineSuccessMessage(`Patient registered - LAPID: ${lapid}`))
    navigate(`/app/patients/${patientId}`)
  }

  async function useExistingRecord(candidate: DuplicateCandidate) {
    if (!labId) {
      toast.push('Lab context is missing for this visit.', 'error')
      return
    }

    const now = new Date().toISOString()
    await writeRecord('patient_visits', 'INSERT', {
      id: crypto.randomUUID(),
      lapid: candidate.patient.lapid,
      lab_id: labId,
      visited_at: now,
      created_by: user?.id ?? null
    })

    toast.push(offlineSuccessMessage(`Existing patient visit recorded - ${candidate.patient.lapid}`))
    navigate(`/app/patients/${candidate.patient.id}`)
  }

  const onSubmit = handleSubmit(async (data) => {
    if (!data.consent) {
      toast.push('Consent is required before saving', 'error')
      return
    }

    setLoading(true)
    try {
      const candidate = await findPotentialDuplicate(data.full_name, data.phone)
      if (candidate) {
        setPendingSubmission(data)
        setDuplicate(candidate)
        return
      }

      await createPatientRecord(data)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  })

  async function handleForceNew() {
    if (!pendingSubmission) return
    setLoading(true)
    try {
      await createPatientRecord(pendingSubmission)
      setDuplicate(null)
      setPendingSubmission(null)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Unable to read patient photo'))
      reader.readAsDataURL(file)
    })

    setValue('photo_url', result)
  }

  const duplicateMetadata = useMemo(() => {
    if (!duplicate) return []

    return [
      { label: 'Full name', current: values.full_name, existing: duplicate.patient.full_name },
      { label: 'Phone', current: values.phone, existing: duplicate.patient.phone },
      { label: 'LAPID', current: 'New patient', existing: duplicate.patient.lapid }
    ]
  }, [duplicate, values.full_name, values.phone])

  return (
    <section className="form-page">
      <header>
        <h2>Register Patient</h2>
      </header>

      <form className="form-grid" onSubmit={onSubmit}>
        <Input label="Full name" error={errors.full_name?.message} {...register('full_name', { required: 'Full name is required' })} />
        <Input label="Date of birth (DD/MM/YYYY)" {...register('date_of_birth')} placeholder="DD/MM/YYYY" />

        <label className="form-label">
          Gender
          <select className="form-input" {...register('gender')}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <PhoneInput label="Phone" value={values.phone ?? ''} onChange={(value) => setValue('phone', value, { shouldDirty: true })} />
        <Input label="Address" {...register('address')} />
        <Input label="Next of kin name" {...register('next_of_kin')} />
        <PhoneInput
          label="Next of kin phone"
          value={values.next_of_kin_phone ?? ''}
          onChange={(value) => setValue('next_of_kin_phone', value, { shouldDirty: true })}
        />

        <div className="photo-upload">
          <label className="form-label">Patient photo</label>
          <input ref={fileInputRef} className="photo-upload__input" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload photo
          </Button>
          {values.photo_url ? <span className="form-autosave">Photo attached</span> : null}
        </div>

        <label className="form-label form-checkbox">
          <input type="checkbox" {...register('consent', { required: true })} />
          <span>I consent to my health data being stored and shared across Labora AI labs I visit. I can withdraw this consent at any time.</span>
        </label>

        <div className="form-actions">
          <Button type="submit" loading={loading}>
            Save patient
          </Button>
          <span className="form-autosave">* All changes autosaved locally before sync</span>
        </div>
      </form>

      <Modal
        open={Boolean(duplicate)}
        title="Potential duplicate"
        onClose={() => {
          setDuplicate(null)
          setPendingSubmission(getValues())
        }}
        footer={
          <>
            <Button variant="text" onClick={() => setDuplicate(null)}>
              Go back and edit
            </Button>
            <Button variant="secondary" onClick={() => void handleForceNew()}>
              This is a new patient
            </Button>
            <Button variant="primary" onClick={() => duplicate && void useExistingRecord(duplicate)}>
              Use existing record
            </Button>
          </>
        }
      >
        <p>We found an existing patient with similar details.</p>
        <p className="duplicate-confidence">{Math.round((duplicate?.matchScore ?? 0) * 100)}% match</p>
        <div className="duplicate-table">
          <div className="duplicate-row duplicate-row--header">
            <strong>Attribute</strong>
            <strong>Current entry</strong>
            <strong>Existing record</strong>
          </div>
          {duplicateMetadata.map((item) => {
            const exactMatch = item.current?.toLowerCase() === item.existing?.toLowerCase()
            return (
              <div key={item.label} className="duplicate-row">
                <strong>{item.label}</strong>
                <p className={exactMatch ? 'duplicate-match duplicate-match--exact' : 'duplicate-match duplicate-match--possible'}>{item.current || '-'}</p>
                <p className={exactMatch ? 'duplicate-existing duplicate-match--exact' : 'duplicate-existing'}>{item.existing || '-'}</p>
              </div>
            )
          })}
        </div>
      </Modal>
    </section>
  )
}
