-- Audit log table for tracking all data modifications
-- Records INSERT, UPDATE, DELETE operations on key tables
-- Accessible only to owner role for compliance

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid references lab_staff(id),
  user_role text,
  lab_id uuid references labs(id),
  old_record jsonb,
  new_record jsonb,
  changed_fields text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_audit_log_table_name on audit_log(table_name);
create index if not exists idx_audit_log_record_id on audit_log(record_id);
create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_lab_id on audit_log(lab_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- Row Level Security
alter table audit_log enable row level security;

-- Only owner can view audit logs
create policy "Only owner can view audit logs"
  on audit_log for select
  using (
    exists (
      select 1 from lab_staff
      where lab_staff.id = auth.uid()
      and lab_staff.role = 'owner'
    )
  );

-- No one can insert directly (only via writeRecord Edge Function)
create policy "No direct inserts on audit_log"
  on audit_log for insert
  with check (false);

-- No one can update audit logs (immutable)
create policy "No updates on audit_log"
  on audit_log for update
  using (false);

-- No one can delete audit logs (immutable)
create policy "No deletes on audit_log"
  on audit_log for delete
  using (false);

-- Grant service role permission to insert (for Edge Functions)
grant insert on audit_log to service_role;
