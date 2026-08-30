-- Transylvania Trivia Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    role VARCHAR NOT NULL DEFAULT 'MEMBER',
    avatar TEXT,
    team_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL UNIQUE,
    leader_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    tagline TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key back to users for team_id
ALTER TABLE users ADD CONSTRAINT fk_user_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Seasons Table
CREATE TABLE IF NOT EXISTS seasons (
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
CREATE TABLE IF NOT EXISTS editions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    season_id VARCHAR NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    edition_number INTEGER NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    theme TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    max_teams INTEGER NOT NULL DEFAULT 25,
    secret_clue TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_season_edition UNIQUE (season_id, edition_number)
);

-- 5. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR REFERENCES teams(id) ON DELETE SET NULL,
    edition_id VARCHAR NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    member_count INTEGER NOT NULL CHECK (member_count >= 1 AND member_count <= 6),
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Weekly Puzzle Progress Table
CREATE TABLE IF NOT EXISTS weekly_puzzle_progress (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    edition_id VARCHAR NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    game_type VARCHAR NOT NULL,
    is_solved BOOLEAN NOT NULL DEFAULT false,
    solved_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    data JSONB,
    solved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_team_edition_game UNIQUE (team_id, edition_id, game_type)
);

-- 7. Theme Suggestions Table
CREATE TABLE IF NOT EXISTS theme_suggestions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id VARCHAR REFERENCES teams(id) ON DELETE SET NULL,
    edition_id VARCHAR REFERENCES editions(id) ON DELETE SET NULL,
    theme_name TEXT NOT NULL,
    description TEXT,
    popularity_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'PENDING',
    proposed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_editions_event_date ON editions(event_date);
CREATE INDEX IF NOT EXISTS idx_registrations_edition ON registrations(edition_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_progress_team ON weekly_puzzle_progress(team_id, edition_id);
