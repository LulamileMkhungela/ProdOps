# Database & migrations

> **Local template draft.** Generated in your browser from the brief by the ProdOps compiler. No AI model was used and nothing was validated with real users. Replace anything that does not fit before approval.

Suggested from the **Clinic operations** pattern. If entities, sections or personas below do not fit your product, rename or delete them; pick a different pattern if the match is wrong.

## Schema (PostgreSQL)
```sql
-- ProdOps — generated schema (PostgreSQL)
-- Deterministic output: the same seed always produces this file.
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,  -- Plain text, maximum 500 characters unless specified.
  phone text not null,  -- E.164 formatted where possible.
  email citext not null,  -- Validated email address, used for notifications.
  status text not null check (status in ('Active', 'New', 'Recall due', 'Inactive')),  -- One of: Active · New · Recall due · Inactive
  cover text not null,  -- Medical aid or self-pay
  lastVisit date not null,  -- Calendar date; rendered in the workspace timezone.
  visits integer not null,  -- Plain text, maximum 500 characters unless specified.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index patients_status_idx on patients (status);
create index patients_lastVisit_idx on patients (lastVisit);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients (id) on delete set null,  -- Links to Patient; enforced as a foreign key.
  clinician_id uuid references clinicians (id) on delete set null,  -- Links to Clinician; enforced as a foreign key.
  time date not null,  -- Calendar date; rendered in the workspace timezone.
  kind text not null check (kind in ('Consult', 'Follow-up', 'Procedure', 'Telehealth')),  -- One of: Consult · Follow-up · Procedure · Telehealth
  status text not null check (status in ('Confirmed', 'Unconfirmed', 'Arrived', 'Completed', 'No-show', 'Cancelled')),  -- One of: Confirmed · Unconfirmed · Arrived · Completed · No-show · Cancelled
  room text not null,  -- Plain text, maximum 500 characters unless specified.
  duration integer not null,  -- Minutes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index appointments_kind_idx on appointments (kind);
create index appointments_time_idx on appointments (time);

create table clinicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,  -- Plain text, maximum 500 characters unless specified.
  specialty text not null,  -- Free-form label drawn from a controlled vocabulary.
  status text not null check (status in ('On duty', 'Off duty', 'On leave')),  -- One of: On duty · Off duty · On leave
  rooms text not null,  -- Plain text, maximum 500 characters unless specified.
  patientsToday integer not null,  -- Plain text, maximum 500 characters unless specified.
  utilisation smallint not null,  -- Whole percentage, 0–100.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index clinicians_status_idx on clinicians (status);

create table notes (
  id uuid primary key default gen_random_uuid(),
  summary text not null,  -- Plain text, maximum 500 characters unless specified.
  patient_id uuid references patients (id) on delete set null,  -- Links to Patient; enforced as a foreign key.
  appointment_id uuid references appointments (id) on delete set null,  -- Links to Appointment; enforced as a foreign key.
  status text not null check (status in ('Draft', 'Signed', 'Amended', 'Awaiting review')),  -- One of: Draft · Signed · Amended · Awaiting review
  signedAt date not null,  -- Calendar date; rendered in the workspace timezone.
  code text not null,  -- Procedure or tariff code
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index notes_status_idx on notes (status);
create index notes_signedAt_idx on notes (signedAt);

create table claims (
  id uuid primary key default gen_random_uuid(),
  reference text not null,  -- Plain text, maximum 500 characters unless specified.
  patient_id uuid references patients (id) on delete set null,  -- Links to Patient; enforced as a foreign key.
  scheme text not null,  -- Free-form label drawn from a controlled vocabulary.
  amount numeric(14,2) not null,  -- Currency amount, stored as numeric(14,2).
  status text not null check (status in ('Draft', 'Submitted', 'Paid', 'Rejected', 'Resubmitted')),  -- One of: Draft · Submitted · Paid · Rejected · Resubmitted
  submitted date not null,  -- Calendar date; rendered in the workspace timezone.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index claims_status_idx on claims (status);
create index claims_submitted_idx on claims (submitted);

-- Relationships
-- patients 1 —— * appointments  (via appointments.patient_id)
-- clinicians 1 —— * appointments  (via appointments.clinician_id)
-- patients 1 —— * notes  (via notes.patient_id)
-- appointments 1 —— * notes  (via notes.appointment_id)
-- patients 1 —— * claims  (via claims.patient_id)
```

## Migration notes
- Create tables in dependency order; seed from the sample rows in the data step
- Add indexes for every foreign key and every searched column
- Plan reversible migrations
