import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Input, PhoneInput, Button, Modal, useToast } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { writeRecord } from '@/lib/writeRecord'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'

interface FormValues {
  full_name: string
  date_of_birth?: string
  gender: 'male' | 'female' | 'other'
  phone: string
  address?: string
  next_of_kin?: string
  next_of_kin_phone?: string
  consent: boolean
}

export function RegisterPatientPage() {
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: { gender: 'male', consent: true }
  })
  const [loading, setLoading] = useState(false)
  const [duplicate, setDuplicate] = useState<any | null>(null)
  const [forceNew, setForceNew] = useState(false)
  const { role, labId, user } = useAuthContext()
  const toast = useToast()
  const navigate = useNavigate()

  const values = watch()
  const hasConsent = values.consent

  const checkDuplicates = async (phone: string) => {
    const local = await db.patients.where('phone').equals(phone).first()
    if (local) return local
    const fuzzy = await db.patients.toArray()
    return fuzzy.find((patient) =>
      patient.full_name.toLowerCase().includes(values.full_name.toLowerCase().slice(0, 3))
    )
  }

  const onSubmit = async (data: FormValues) => {
    if (!hasConsent) {
      toast.push('Consent is required before saving', 'error')
      return
    }
    setLoading(true)
    try {
      const dup = await checkDuplicates(data.phone)
      if (dup && !forceNew) {
        setDuplicate(dup)
        setLoading(false)
        return
      }

      const { data: lapidResponse, error: lapidError } = await supabase.rpc('generate_lapid')
      if (lapidError) throw lapidError
      const lapid = (lapidResponse as string) ?? `LA-${new Date().getFullYear()}-00001`

      const patientPayload = {
        id: crypto.randomUUID(),
        lapid,
        full_name: data.full_name,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender,
        phone: data.phone,
        address: data.address || null,
        next_of_kin: data.next_of_kin || null,
        next_of_kin_phone: data.next_of_kin_phone || null,
        consent: data.consent,
        consent_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await writeRecord('patients', 'INSERT', patientPayload)

      if (labId) {
        await writeRecord('patient_visits', 'INSERT', {
          id: crypto.randomUUID(),
          lapid,
          lab_id: labId,
          visited_at: new Date().toISOString(),
          created_by: user?.id ?? null
        })
      }

      toast.push(`Patient registered — LAPID: ${lapid}`)
      navigate('/app/patients')
    } catch (error) {
      toast.push((error as Error).message, 'error')
    } finally {
      setLoading(false)
      setForceNew(false)
    }
  }

  const duplicateMetadata = useMemo(
    () =>
      duplicate
        ? [
            { label: 'Full name', current: values.full_name, existing: duplicate.full_name },
            { label: 'Phone', current: values.phone, existing: duplicate.phone },
            { label: 'LAPID', current: 'New', existing: duplicate.lapid }
          ]
        : [],
    [duplicate, values]
  )

  return (
    <section className="form-page">
      <header>
        <h2>Register Patient</h2>
      </header>
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Full name" {...register('full_name', { required: true })} />
        <Input label="Date of birth (DD/MM/YYYY)" {...register('date_of_birth')} placeholder="DD/MM/YYYY" />
        <label className="form-label">
          Gender
          <select className="form-input" {...register('gender')}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <PhoneInput label="Phone" value={values.phone} onChange={(value) => setValue('phone', value)} />
        <Input label="Address" {...register('address')} />
        <Input label="Next of kin name" {...register('next_of_kin')} />
        <PhoneInput label="Next of kin phone" value={values.next_of_kin_phone ?? ''} onChange={(value) => setValue('next_of_kin_phone', value)} />
        <label className="form-label">
          <input type="checkbox" {...register('consent')} />
          I consent to my health data being stored and shared across Labora AI labs I visit.
        </label>
        <Button type="submit" loading={loading}>
          Save patient
        </Button>
        <span className="form-autosave">• All changes autosaved</span>
      </form>
      <Modal
        open={Boolean(duplicate)}
        title="Potential duplicate"
        onClose={() => setDuplicate(null)}
        footer={
          <>
            <Button variant="text" onClick={() => setDuplicate(null)}>
              Go back & edit
            </Button>
            <Button variant="secondary" onClick={() => setForceNew(true)}>
              This is a new patient
            </Button>
            <Button variant="primary" onClick={() => duplicate && navigate(`/app/patients/${duplicate.id}`)}>
              Use existing record
            </Button>
          </>
        }
      >
        <p>We found an existing patient with similar details.</p>
        <div className="duplicate-table">
          {duplicateMetadata.map((item) => (
            <div key={item.label} className="duplicate-row">
              <strong>{item.label}</strong>
              <p>{item.current}</p>
              <p className="duplicate-existing">{item.existing}</p>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  )
}
