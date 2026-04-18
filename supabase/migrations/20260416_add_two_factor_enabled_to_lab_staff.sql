alter table public.lab_staff
add column if not exists two_factor_enabled boolean not null default false;
