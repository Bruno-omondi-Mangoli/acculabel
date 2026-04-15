-- ============================================
-- DATA ANNOTATION PLATFORM - COMPLETE SCHEMA
-- ============================================
-- Run this script on PostgreSQL (Supabase / Render / Local)
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'annotator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255),
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    file_size INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. ANNOTATIONS TABLE (Main annotation storage)
-- ============================================
CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Annotation type
    type VARCHAR(50) DEFAULT 'rectangle',
    label VARCHAR(100) NOT NULL,
    
    -- Rectangle/Cuboid coordinates
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    depth FLOAT,
    
    -- Polygon/Polyline points (JSON array)
    points JSONB,
    
    -- Sentiment analysis
    sentiment VARCHAR(50),
    sentiment_score FLOAT,
    
    -- Image comparison
    comparison_winner VARCHAR(50),
    comparison_image_url VARCHAR(500),
    
    -- Review workflow
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    quality_score FLOAT,
    
    -- Metadata
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PASSWORD RESETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. PROJECTS TABLE (For project management)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. PROJECT IMAGES TABLE (Many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS project_images (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Images indexes
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at);

-- Annotations indexes
CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_label ON annotations(label);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
CREATE INDEX IF NOT EXISTS idx_annotations_reviewed ON annotations(reviewed);
CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at);

-- Password resets indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Project images indexes
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_project_images_image_id ON project_images(image_id);
CREATE INDEX IF NOT EXISTS idx_project_images_assigned_to ON project_images(assigned_to);

-- ============================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_annotations_updated_at ON annotations;
CREATE TRIGGER update_annotations_updated_at
    BEFORE UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. INSERT SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Insert sample admin user (password: admin123)
-- Note: Password hash is for demonstration. Use your own hash in production.
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@example.com', '$argon2id$v=19$m=65536,t=3,p=4$samplehash', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 10. VERIFY SCHEMA
-- ============================================

-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ============================================
-- END OF SCHEMA
-- ============================================