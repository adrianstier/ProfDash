-- ProfDash - Multi-User Database Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ==================== USERS PROFILE ====================
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    institution TEXT,
    department TEXT,
    title TEXT DEFAULT 'Professor',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'misc',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    due DATE,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PAPERS ====================
CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    authors TEXT,
    journal TEXT,
    status TEXT DEFAULT 'idea',
    notes TEXT,
    citations INTEGER DEFAULT 0,
    last_update DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== GRANTS ====================
CREATE TABLE IF NOT EXISTS grants (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    agency TEXT,
    role TEXT DEFAULT 'PI',
    amount DECIMAL(15, 2) DEFAULT 0,
    spent DECIMAL(15, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    deliverables JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== GRANT OPPORTUNITIES ====================
CREATE TABLE IF NOT EXISTS grant_opportunities (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    deadline DATE,
    amount TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PERSONNEL ====================
CREATE TABLE IF NOT EXISTS personnel (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'PhD Student',
    year INTEGER DEFAULT 1,
    funding TEXT,
    email TEXT,
    last_meeting DATE,
    milestones JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== COURSES ====================
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    code TEXT NOT NULL,
    name TEXT,
    quarter TEXT,
    students INTEGER DEFAULT 0,
    esci DECIMAL(3, 2) DEFAULT 0,
    credits DECIMAL(3, 2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INNOVATIONS ====================
CREATE TABLE IF NOT EXISTS innovations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE innovations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Papers policies
CREATE POLICY "Users can view own papers" ON papers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own papers" ON papers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own papers" ON papers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own papers" ON papers
    FOR DELETE USING (auth.uid() = user_id);

-- Grants policies
CREATE POLICY "Users can view own grants" ON grants
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grants" ON grants
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grants" ON grants
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grants" ON grants
    FOR DELETE USING (auth.uid() = user_id);

-- Grant opportunities policies
CREATE POLICY "Users can view own grant opportunities" ON grant_opportunities
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grant opportunities" ON grant_opportunities
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grant opportunities" ON grant_opportunities
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grant opportunities" ON grant_opportunities
    FOR DELETE USING (auth.uid() = user_id);

-- Personnel policies
CREATE POLICY "Users can view own personnel" ON personnel
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own personnel" ON personnel
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own personnel" ON personnel
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own personnel" ON personnel
    FOR DELETE USING (auth.uid() = user_id);

-- Courses policies
CREATE POLICY "Users can view own courses" ON courses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON courses
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON courses
    FOR DELETE USING (auth.uid() = user_id);

-- Innovations policies
CREATE POLICY "Users can view own innovations" ON innovations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own innovations" ON innovations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own innovations" ON innovations
    FOR DELETE USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view own settings" ON settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings
    FOR DELETE USING (auth.uid() = user_id);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(user_id, due);
CREATE INDEX IF NOT EXISTS idx_papers_user ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_grants_user ON grants(user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_user ON personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);

-- ==================== FUNCTIONS ====================
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
