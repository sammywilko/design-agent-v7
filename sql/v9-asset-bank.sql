-- ============================================
-- Design Agent V9 - Asset Bank Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Asset Bank table for storing liked images for social media
CREATE TABLE IF NOT EXISTS asset_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',

  -- Project context
  project_id TEXT,
  project_name TEXT,

  -- Image data
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  entity_type TEXT DEFAULT 'other', -- character, location, product, scene, hero, social, other
  entity_name TEXT,
  tags TEXT[] DEFAULT '{}',
  title TEXT,
  description TEXT,

  -- Generation context
  prompt_used TEXT,
  model_used TEXT,
  generation_params JSONB,
  aspect_ratio TEXT,

  -- Social media tracking
  used_in_posts TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_asset_bank_tenant ON asset_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_bank_entity_type ON asset_bank(entity_type);
CREATE INDEX IF NOT EXISTS idx_asset_bank_favorite ON asset_bank(is_favorite);
CREATE INDEX IF NOT EXISTS idx_asset_bank_project ON asset_bank(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_bank_created ON asset_bank(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_bank_tags ON asset_bank USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE asset_bank ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users with matching tenant
CREATE POLICY "asset_bank_tenant_policy" ON asset_bank
  FOR ALL
  USING (tenant_id = 'cc-internal-001');

-- ============================================
-- Project Memory table for persistent context
-- ============================================

CREATE TABLE IF NOT EXISTS project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',
  project_id TEXT NOT NULL,

  -- Memory types: character, location, product, style, decision, correction
  memory_type TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,

  -- Context
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'user_input', -- user_input, ai_extraction, correction, auto

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per project/type/key
  UNIQUE(project_id, memory_type, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_memory_project ON project_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memory_type ON project_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_project_memory_tenant ON project_memory(tenant_id);

-- Enable Row Level Security
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "project_memory_tenant_policy" ON project_memory
  FOR ALL
  USING (tenant_id = 'cc-internal-001');

-- ============================================
-- Scheduled Tasks table for automation
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',

  -- Task definition
  name TEXT NOT NULL,
  task_type TEXT NOT NULL, -- batch_generation, consistency_check, cleanup, social_post
  schedule TEXT, -- cron expression or null for one-time
  is_recurring BOOLEAN DEFAULT false,

  -- Payload
  payload JSONB,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  enabled BOOLEAN DEFAULT true,

  -- Execution tracking
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_tenant ON scheduled_tasks(tenant_id);

-- Enable Row Level Security
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "scheduled_tasks_tenant_policy" ON scheduled_tasks
  FOR ALL
  USING (tenant_id = 'cc-internal-001');

-- ============================================
-- Task Execution Log
-- ============================================

CREATE TABLE IF NOT EXISTS task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',
  task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE,

  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- running, completed, failed

  -- Results
  result JSONB,
  error TEXT,

  -- Metrics
  duration_ms INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_started ON task_executions(started_at DESC);

-- Enable RLS
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_executions_tenant_policy" ON task_executions
  FOR ALL
  USING (tenant_id = 'cc-internal-001');

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify tables were created:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('asset_bank', 'project_memory', 'scheduled_tasks', 'task_executions');
