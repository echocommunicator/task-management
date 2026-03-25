-- ============================================================================
-- 001_initial_schema.sql
-- Complete initial schema for task management system
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'closed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ============================================================================
-- 2. PROFILES TABLE (extends auth.users)
-- ============================================================================

CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL,
    avatar_url  TEXT,
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. TEAMS TABLE
-- ============================================================================

CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by  UUID NOT NULL REFERENCES profiles (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. TEAM_MEMBERS TABLE
-- ============================================================================

CREATE TABLE team_members (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    role      TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

-- ============================================================================
-- 5. TASKS TABLE
-- ============================================================================

CREATE TABLE tasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number           TEXT UNIQUE,
    task_name             TEXT NOT NULL,
    description           TEXT,
    assigned_to           UUID NOT NULL REFERENCES profiles (id),
    assigned_by           UUID NOT NULL REFERENCES profiles (id),
    parent_task_id        UUID REFERENCES tasks (id),
    due_date              DATE NOT NULL,
    start_date            DATE,
    status                task_status NOT NULL DEFAULT 'pending',
    priority              task_priority NOT NULL DEFAULT 'medium',
    tags                  TEXT[] DEFAULT '{}',
    estimated_hours       NUMERIC,
    actual_hours          NUMERIC,
    completion_notes      TEXT,
    completion_percentage INT NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    closed_at             TIMESTAMPTZ,
    closed_by             UUID REFERENCES profiles (id),
    closure_reason        TEXT,
    completed_at          TIMESTAMPTZ,
    restart_reason        TEXT,
    restarted_at          TIMESTAMPTZ,
    restarted_by          UUID REFERENCES profiles (id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. TASK_ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE task_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    file_type       TEXT NOT NULL,
    attachment_type TEXT NOT NULL DEFAULT 'general',
    uploaded_by     UUID NOT NULL REFERENCES profiles (id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. TASK_COMMENTS TABLE
-- ============================================================================

CREATE TABLE task_comments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES profiles (id),
    comment      TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'comment',
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. TASK_WATCHERS TABLE
-- ============================================================================

CREATE TABLE task_watchers (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    UNIQUE (task_id, user_id)
);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES profiles (id),
    notification_type TEXT NOT NULL,
    title             TEXT NOT NULL,
    message           TEXT NOT NULL,
    task_id           UUID REFERENCES tasks (id),
    is_read           BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. INDEXES
-- ============================================================================

CREATE INDEX idx_tasks_assigned_to      ON tasks (assigned_to);
CREATE INDEX idx_tasks_assigned_by      ON tasks (assigned_by);
CREATE INDEX idx_tasks_parent_task_id   ON tasks (parent_task_id);
CREATE INDEX idx_tasks_status           ON tasks (status);
CREATE INDEX idx_tasks_due_date         ON tasks (due_date);
CREATE INDEX idx_tasks_priority         ON tasks (priority);
CREATE INDEX idx_task_attachments_task_id ON task_attachments (task_id);
CREATE INDEX idx_task_comments_task_id  ON task_comments (task_id);
CREATE INDEX idx_notifications_user_id_read ON notifications (user_id, is_read);

-- ============================================================================
-- 11. TRIGGER FUNCTIONS
-- ============================================================================

-- 11a. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11b. Auto-generate sequential task number (TASK-0001, TASK-0002, ...)
CREATE OR REPLACE FUNCTION auto_generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 6) AS INT)), 0) + 1
      INTO next_num
      FROM tasks;
    NEW.task_number := 'TASK-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11c. Notify on task assignment (creates notification + adds watcher)
CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire on INSERT or when assigned_to actually changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        -- Create notification for the assigned user
        INSERT INTO notifications (user_id, notification_type, title, message, task_id)
        VALUES (
            NEW.assigned_to,
            'task_assignment',
            'New Task Assigned',
            'You have been assigned task ' || NEW.task_number || ': ' || NEW.task_name,
            NEW.id
        );

        -- Add assigned user as a watcher (ignore if already watching)
        INSERT INTO task_watchers (task_id, user_id)
        VALUES (NEW.id, NEW.assigned_to)
        ON CONFLICT (task_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11d. Log status change as a system comment
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_comments (task_id, user_id, comment, comment_type, metadata)
        VALUES (
            NEW.id,
            NEW.assigned_to,
            'Status changed from ' || OLD.status || ' to ' || NEW.status,
            'system',
            jsonb_build_object('old_status', OLD.status::TEXT, 'new_status', NEW.status::TEXT)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11e. Auto-set completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION auto_set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        NEW.completed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11f. Auto-set closed_at when status changes to 'closed'
CREATE OR REPLACE FUNCTION auto_set_closed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
        NEW.closed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. ATTACH TRIGGERS TO TABLES
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate task number before insert
CREATE TRIGGER trg_tasks_auto_number
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_generate_task_number();

-- Auto-set completed_at (BEFORE UPDATE so it can modify NEW)
CREATE TRIGGER trg_tasks_auto_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_set_completed_at();

-- Auto-set closed_at (BEFORE UPDATE so it can modify NEW)
CREATE TRIGGER trg_tasks_auto_closed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_set_closed_at();

-- Notify on task assignment (AFTER INSERT or UPDATE)
CREATE TRIGGER trg_tasks_notify_assignment
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_on_task_assignment();

-- Log status change (AFTER UPDATE)
CREATE TRIGGER trg_tasks_log_status_change
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY "Authenticated users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ---- teams ----
CREATE POLICY "Authenticated users can view all teams"
    ON teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create teams"
    ON teams FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- ---- team_members ----
CREATE POLICY "Authenticated users can view team members"
    ON team_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team creators can manage members"
    ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams WHERE teams.id = team_id AND teams.created_by = auth.uid()
        )
    );

-- ---- tasks ----
CREATE POLICY "Users can view tasks assigned to or created by them"
    ON tasks FOR SELECT
    TO authenticated
    USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Authenticated users can create tasks"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can update tasks assigned to or created by them"
    ON tasks FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid() OR assigned_by = auth.uid())
    WITH CHECK (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Task creators can delete tasks"
    ON tasks FOR DELETE
    TO authenticated
    USING (assigned_by = auth.uid());

CREATE POLICY "Attachment uploaders can delete their attachments"
    ON task_attachments FOR DELETE
    TO authenticated
    USING (uploaded_by = auth.uid());

-- ---- task_attachments ----
CREATE POLICY "Users on the task can view attachments"
    ON task_attachments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_id
              AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
    );

CREATE POLICY "Users on the task can upload attachments"
    ON task_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_id
              AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
    );

-- ---- task_comments ----
CREATE POLICY "Users on the task can view comments"
    ON task_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_id
              AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
    );

CREATE POLICY "Users on the task can add comments"
    ON task_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_id
              AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
    );

-- ---- task_watchers ----
CREATE POLICY "Users on the task can view watchers"
    ON task_watchers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_id
              AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
    );

-- ---- notifications ----
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 14. AUTO-CREATE PROFILE ON AUTH.USERS INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 15. STORAGE BUCKET FOR TASK ATTACHMENTS
-- ============================================================================
-- Note: Storage bucket creation is handled via the Supabase Dashboard or
-- the Supabase Management API. Run the following via the dashboard SQL editor
-- or API if needed:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('task-attachments', 'task-attachments', false);
--
--   CREATE POLICY "Authenticated users can upload task attachments"
--       ON storage.objects FOR INSERT
--       TO authenticated
--       WITH CHECK (bucket_id = 'task-attachments');
--
--   CREATE POLICY "Authenticated users can view task attachments"
--       ON storage.objects FOR SELECT
--       TO authenticated
--       USING (bucket_id = 'task-attachments');
