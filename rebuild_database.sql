-- =====================================================
-- DYSFUNCTNL DATABASE SCHEMA RECREATION SCRIPT
-- PostgreSQL 18.1
-- =====================================================

-- Drop existing schema (BE CAREFUL - this will delete everything!)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS AND AUTHENTICATION
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- =====================================================
-- GROUPS AND MEMBERSHIP
-- =====================================================

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Group members junction table
CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Group member roles
CREATE TABLE group_members_roles (
    user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id, group_id) REFERENCES group_members(user_id, group_id) ON DELETE CASCADE
);

-- =====================================================
-- MEDIA (ALBUMS AND FILES)
-- =====================================================

-- Media albums
CREATE TABLE media_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Media files (photos/videos)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES media_albums(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video')),
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(500),
    bucket_key VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =====================================================
-- CALENDAR EVENTS
-- =====================================================

CREATE TABLE calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    participants UUID[] DEFAULT ARRAY[]::UUID[],
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =====================================================
-- LISTS AND LIST ITEMS
-- =====================================================

-- Lists table
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    list_type VARCHAR(20) NOT NULL CHECK (list_type IN ('shopping', 'todo', 'other')),
    title VARCHAR(100) NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- List items
CREATE TABLE list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =====================================================
-- TEXT CHANNELS AND MESSAGES
-- =====================================================

-- Text channels
CREATE TABLE text_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Text channel messages
CREATE TABLE text_channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES text_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Group memberships
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);

-- Media queries
CREATE INDEX idx_media_albums_group ON media_albums(group_id);
CREATE INDEX idx_media_album ON media(album_id);
CREATE INDEX idx_media_group ON media(group_id);

-- Calendar queries
CREATE INDEX idx_calendar_group ON calendar(group_id);
CREATE INDEX idx_calendar_time_range ON calendar(start_time, end_time);

-- Lists queries
CREATE INDEX idx_lists_group ON lists(group_id);
CREATE INDEX idx_lists_assigned ON lists(assigned_to);
CREATE INDEX idx_list_items_list ON list_items(list_id);

-- Text channels and messages
CREATE INDEX idx_text_channels_group ON text_channels(group_id);
CREATE INDEX idx_text_messages_channel ON text_channel_messages(channel_id);
CREATE INDEX idx_text_messages_sender ON text_channel_messages(sender_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with that column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_albums_updated_at BEFORE UPDATE ON media_albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_updated_at BEFORE UPDATE ON calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_items_updated_at BEFORE UPDATE ON list_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_channels_updated_at BEFORE UPDATE ON text_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_messages_updated_at BEFORE UPDATE ON text_channel_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LIST COMPLETION TRIGGER
-- =====================================================

-- Function to check if all items in a list are completed
CREATE OR REPLACE FUNCTION check_list_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if all items in the list are completed
    IF NOT EXISTS (
        SELECT 1 FROM list_items 
        WHERE list_id = NEW.list_id AND completed = FALSE
    ) THEN
        -- All items completed, mark list as completed
        UPDATE lists 
        SET completed = TRUE, completed_at = NOW()
        WHERE id = NEW.list_id;
    ELSE
        -- Some items not completed, mark list as not completed
        UPDATE lists 
        SET completed = FALSE, completed_at = NULL
        WHERE id = NEW.list_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for list item updates
CREATE TRIGGER update_list_completion_status
AFTER UPDATE OF completed ON list_items
FOR EACH ROW
EXECUTE FUNCTION check_list_completion();

-- Trigger for list item inserts
CREATE TRIGGER check_list_completion_on_insert
AFTER INSERT ON list_items
FOR EACH ROW
EXECUTE FUNCTION check_list_completion();

-- Trigger for list item deletes
CREATE TRIGGER check_list_completion_on_delete
AFTER DELETE ON list_items
FOR EACH ROW
EXECUTE FUNCTION check_list_completion();

-- =====================================================
-- SAMPLE TEST DATA (OPTIONAL - Comment out in production)
-- =====================================================

-- Create a test user (password is 'testpassword123' bcrypt hashed)
INSERT INTO users (email, password_hash, first_name, last_name) 
VALUES ('test@example.com', '$2b$10$YourHashHere', 'Test', 'User');

-- =====================================================
-- PERMISSIONS (Update with your actual database user)
-- =====================================================

-- Grant all privileges on all tables to your app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- =====================================================
-- DATABASE CONFIGURATION CHECK
-- =====================================================

-- Verify installation
SELECT 
    current_database() as database,
    current_user as user,
    version() as postgres_version,
    pg_database_size(current_database()) as database_size;

-- List all tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Dysfunctnl application database schema - rebuilt from Express.js repository';
