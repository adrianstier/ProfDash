-- Add subtasks column to tasks table as JSONB array
-- Each subtask is stored as: { id, text, completed, priority?, estimatedMinutes? }
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'subtasks'
  ) THEN
    ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]';
  END IF;
END $$;
