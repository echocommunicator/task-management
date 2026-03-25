-- ============================================================================
-- 002_user_management.sql
-- User management, organization hierarchy, designations, and feature access
-- Builds on top of 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. ENUM: app_role
-- ============================================================================

CREATE TYPE app_role AS ENUM (
    'super_admin',
    'admin',
    'sales_manager',
    'sales_agent',
    'support_manager',
    'support_agent',
    'analyst'
);

-- ============================================================================
-- 2. ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ALTER PROFILES TABLE — add new columns
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS designation_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. USER_ROLES TABLE
-- ============================================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'sales_agent',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, org_id)
);

-- ============================================================================
-- 5. DESIGNATIONS TABLE
-- ============================================================================

CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    role app_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. ADD FK: profiles.designation_id → designations
-- ============================================================================

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_designation FOREIGN KEY (designation_id) REFERENCES designations(id);

-- ============================================================================
-- 7. DESIGNATION_FEATURE_ACCESS TABLE
-- ============================================================================

CREATE TABLE designation_feature_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT true,
    custom_permissions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(designation_id, feature_key)
);

-- ============================================================================
-- 8. REPORTING_HIERARCHY TABLE
-- ============================================================================

CREATE TABLE reporting_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE CASCADE,
    reports_to_designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, designation_id)
);

-- ============================================================================
-- 9. FEATURE_PERMISSIONS TABLE (master list of features)
-- ============================================================================

CREATE TABLE feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    feature_name TEXT NOT NULL,
    feature_description TEXT,
    category TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. SEED DEFAULT FEATURE PERMISSIONS
-- ============================================================================

INSERT INTO feature_permissions (feature_key, feature_name, category) VALUES
    ('tasks', 'Tasks', 'Task Management'),
    ('task_create', 'Create Tasks', 'Task Management'),
    ('task_assign', 'Assign Tasks', 'Task Management'),
    ('task_close', 'Close/Verify Tasks', 'Task Management'),
    ('task_delete', 'Delete Tasks', 'Task Management'),
    ('subtasks', 'Subtasks', 'Task Management'),
    ('comments', 'Comments', 'Collaboration'),
    ('attachments', 'Attachments', 'Collaboration'),
    ('dashboard', 'Dashboard', 'Analytics'),
    ('reports', 'Reports & Analytics', 'Analytics'),
    ('users', 'User Management', 'Administration'),
    ('designations', 'Designations', 'Administration'),
    ('access_management', 'Access Management', 'Administration'),
    ('teams', 'Team Management', 'Administration'),
    ('notifications', 'Notifications', 'System');

-- ============================================================================
-- 11. TRIGGER FUNCTION: check_admin_limit (max 5 admins per org)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_admin_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'admin' THEN
        IF (SELECT COUNT(*) FROM user_roles WHERE org_id = NEW.org_id AND role = 'admin' AND is_active = true AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')) >= 5 THEN
            RAISE EXCEPTION 'Maximum of 5 admins per organization';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_admin_limit
    BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION check_admin_limit();

-- ============================================================================
-- 12. UPDATED_AT TRIGGERS for new tables
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
-- ============================================================================

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_designations_updated_at
    BEFORE UPDATE ON designations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. INDEXES
-- ============================================================================

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON user_roles(org_id);
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_designations_org_id ON designations(org_id);
CREATE INDEX idx_designation_feature_access_designation_id ON designation_feature_access(designation_id);
CREATE INDEX idx_reporting_hierarchy_org_id ON reporting_hierarchy(org_id);

-- ============================================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE designation_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting_hierarchy        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_permissions        ENABLE ROW LEVEL SECURITY;

-- ---- organizations ----

CREATE POLICY "Authenticated users can read all organizations"
    ON organizations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super admins and admins can update organizations"
    ON organizations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = organizations.id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = organizations.id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

-- ---- user_roles ----

CREATE POLICY "Authenticated users can read user roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and super admins can insert user roles"
    ON user_roles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles AS ur
            WHERE ur.user_id = auth.uid()
              AND ur.org_id = user_roles.org_id
              AND ur.role IN ('super_admin', 'admin')
              AND ur.is_active = true
        )
    );

CREATE POLICY "Admins and super admins can update user roles"
    ON user_roles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles AS ur
            WHERE ur.user_id = auth.uid()
              AND ur.org_id = user_roles.org_id
              AND ur.role IN ('super_admin', 'admin')
              AND ur.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles AS ur
            WHERE ur.user_id = auth.uid()
              AND ur.org_id = user_roles.org_id
              AND ur.role IN ('super_admin', 'admin')
              AND ur.is_active = true
        )
    );

CREATE POLICY "Admins and super admins can delete user roles"
    ON user_roles FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles AS ur
            WHERE ur.user_id = auth.uid()
              AND ur.org_id = user_roles.org_id
              AND ur.role IN ('super_admin', 'admin')
              AND ur.is_active = true
        )
    );

-- ---- designations ----

CREATE POLICY "Authenticated users in org can read designations"
    ON designations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designations.org_id
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can insert designations"
    ON designations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designations.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can update designations"
    ON designations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designations.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designations.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can delete designations"
    ON designations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designations.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

-- ---- designation_feature_access ----

CREATE POLICY "Authenticated users can read designation feature access"
    ON designation_feature_access FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert designation feature access"
    ON designation_feature_access FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designation_feature_access.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can update designation feature access"
    ON designation_feature_access FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designation_feature_access.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designation_feature_access.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can delete designation feature access"
    ON designation_feature_access FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = designation_feature_access.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

-- ---- reporting_hierarchy ----

CREATE POLICY "Authenticated users can read reporting hierarchy"
    ON reporting_hierarchy FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert reporting hierarchy"
    ON reporting_hierarchy FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = reporting_hierarchy.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can update reporting hierarchy"
    ON reporting_hierarchy FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = reporting_hierarchy.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = reporting_hierarchy.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

CREATE POLICY "Admins can delete reporting hierarchy"
    ON reporting_hierarchy FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.org_id = reporting_hierarchy.org_id
              AND user_roles.role IN ('super_admin', 'admin')
              AND user_roles.is_active = true
        )
    );

-- ---- feature_permissions ----

CREATE POLICY "Authenticated users can read all feature permissions"
    ON feature_permissions FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- 15. UPDATE handle_new_user() to populate first_name and last_name
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url, first_name, last_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
