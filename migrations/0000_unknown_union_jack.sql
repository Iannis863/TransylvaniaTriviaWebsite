CREATE TABLE "app_editions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" varchar NOT NULL,
	"edition_number" integer NOT NULL,
	"event_date" timestamp NOT NULL,
	"theme" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"max_teams" integer DEFAULT 10 NOT NULL,
	"secret_clue" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_password_reset_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" varchar(6) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar,
	"edition_id" varchar NOT NULL,
	"team_name" text NOT NULL,
	"captain_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_number" text,
	"member_count" integer NOT NULL,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_seasons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"total_editions" integer DEFAULT 15 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_seasons_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "app_teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"leader_id" varchar NOT NULL,
	"invite_code" varchar(12) NOT NULL,
	"tagline" text,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_teams_name_unique" UNIQUE("name"),
	CONSTRAINT "app_teams_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "app_theme_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar,
	"edition_id" varchar,
	"theme_name" text NOT NULL,
	"description" text,
	"popularity_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"proposed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"avatar" text,
	"team_id" varchar,
	"phone_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_weekly_puzzle_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"edition_id" varchar NOT NULL,
	"game_type" text NOT NULL,
	"is_solved" boolean DEFAULT false NOT NULL,
	"solved_by_user_id" varchar,
	"data" jsonb,
	"solved_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
