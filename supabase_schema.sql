CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all existing tables to sync with the new schema
DROP TABLE IF EXISTS "student_exam_mapping" CASCADE;
DROP TABLE IF EXISTS "results" CASCADE;
DROP TABLE IF EXISTS "questions" CASCADE;
DROP TABLE IF EXISTS "exam_sessions" CASCADE;
DROP TABLE IF EXISTS "subjects" CASCADE;
DROP TABLE IF EXISTS "students" CASCADE;
DROP TABLE IF EXISTS "staff" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  question_count INTEGER DEFAULT 0,
  token TEXT,
  form_url TEXT,
  education_level TEXT CHECK (education_level IN ('SD', 'SMP')),
  school_access JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nomor_peserta TEXT UNIQUE NOT NULL,
  school TEXT,
  npsn TEXT,
  class TEXT,
  room TEXT,
  password TEXT,
  gender TEXT,
  birth_date TEXT,
  is_login BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'PROKTOR',
  school TEXT,
  npsn TEXT,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create student_exam_mapping table
CREATE TABLE IF NOT EXISTS student_exam_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date TEXT,
  session TEXT,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  unique(student_id, subject_id)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid references subjects(id) on delete cascade,
  guru_id uuid null,
  type text check (type in ('pg', 'pgk', 'bs', 'jodoh', 'short', 'long')),
  content jsonb not null,
  points integer default 1,
  created_at timestamptz default now()
);

-- Create results table
CREATE TABLE IF NOT EXISTS results (
  id uuid not null default uuid_generate_v4(),
  exam_id uuid null,
  peserta_id uuid null,
  session_id uuid null,
  answers jsonb null default '[]'::jsonb,
  score numeric null,
  status text null,
  start_time timestamp with time zone null default timezone('utc'::text, now()),
  finish_time timestamp with time zone null,
  violation_count integer null default 0,
  constraint results_pkey primary key (id),
  constraint results_exam_id_peserta_id_key unique (exam_id, peserta_id)
);

-- Create exam_sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
  id uuid not null default uuid_generate_v4(),
  exam_id uuid null references subjects(id) on delete cascade,
  token text null,
  room_name text null,
  proktor_id uuid null references staff(id) on delete set null,
  is_open boolean null default false,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint exam_sessions_pkey primary key (id)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Initialize default settings if not exists
INSERT INTO settings (id, data) VALUES (1, '{"appName": "UJIAN ONLINE", "appSubtitle": "Deskripsi Aplikasi", "themeColor": "#2563eb", "gradientEndColor": "#1e40af", "logoStyle": "circle", "antiCheat": {"isActive": true, "freezeDurationSeconds": 30, "alertText": "Pelanggaran terdeteksi!", "enableSound": true}}'::jsonb) ON CONFLICT DO NOTHING;

-- Insert default admin account
INSERT INTO staff (username, password, name, role, school) VALUES ('superadmin', 'admin', 'Super Admin', 'SUPER_ADMIN', 'PUSAT') ON CONFLICT DO NOTHING;

-- Disable RLS for easy setup
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_exam_mapping DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
