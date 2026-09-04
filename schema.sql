-- Transylvania Trivia Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    role VARCHAR NOT NULL DEFAULT 'MEMBER',
    avatar TEXT,
    team_id VARCHAR,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS app_teams (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL UNIQUE,
    leader_id VARCHAR NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    tagline TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key back to users for team_id
-- We must safely handle adding this constraint since IF NOT EXISTS doesn't support adding constraints directly easily in all postgres versions, but Drizzle push handles this better. We'll skip adding this circularly in the raw SQL and let Drizzle or manual steps handle it if needed.
-- But since it's just schema.sql, we can keep the ALTER TABLE.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_user_team') THEN
        ALTER TABLE app_users ADD CONSTRAINT fk_app_user_team FOREIGN KEY (team_id) REFERENCES app_teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Seasons Table
CREATE TABLE IF NOT EXISTS app_seasons (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    total_editions INTEGER NOT NULL DEFAULT 15,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Editions Table
CREATE TABLE IF NOT EXISTS app_editions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    season_id VARCHAR NOT NULL REFERENCES app_seasons(id) ON DELETE CASCADE,
    edition_number INTEGER NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    theme TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    max_teams INTEGER NOT NULL DEFAULT 25,
    secret_clue TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT app_unique_season_edition UNIQUE (season_id, edition_number)
);

-- 5. Registrations Table
CREATE TABLE IF NOT EXISTS app_registrations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR REFERENCES app_teams(id) ON DELETE SET NULL,
    edition_id VARCHAR NOT NULL REFERENCES app_editions(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    member_count INTEGER NOT NULL CHECK (member_count >= 1 AND member_count <= 6),
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Weekly Puzzle Progress Table
CREATE TABLE IF NOT EXISTS app_weekly_puzzle_progress (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR NOT NULL REFERENCES app_teams(id) ON DELETE CASCADE,
    edition_id VARCHAR NOT NULL REFERENCES app_editions(id) ON DELETE CASCADE,
    game_type VARCHAR NOT NULL,
    is_solved BOOLEAN NOT NULL DEFAULT false,
    solved_by_user_id VARCHAR REFERENCES app_users(id) ON DELETE SET NULL,
    data JSONB,
    solved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT app_unique_team_edition_game UNIQUE (team_id, edition_id, game_type)
);

-- 7. Theme Suggestions Table
CREATE TABLE IF NOT EXISTS app_theme_suggestions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR REFERENCES app_teams(id) ON DELETE SET NULL,
    edition_id VARCHAR REFERENCES app_editions(id) ON DELETE SET NULL,
    theme_name TEXT NOT NULL,
    description TEXT,
    popularity_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'PENDING',
    proposed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_teams_invite_code ON app_teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_app_editions_event_date ON app_editions(event_date);
CREATE INDEX IF NOT EXISTS idx_app_registrations_edition ON app_registrations(edition_id);
CREATE INDEX IF NOT EXISTS idx_app_puzzle_progress_team ON app_weekly_puzzle_progress(team_id, edition_id);
