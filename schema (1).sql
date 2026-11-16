-- Water Intake Tracker: complete schema for a NEW Neon database
-- Neon Console -> SQL Editor -> paste this whole file -> Run

CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password       TEXT NOT NULL,
  age            INTEGER,
  gender         VARCHAR(10),
  weight_kg      NUMERIC(5,1),
  activity_level VARCHAR(10),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS water_goals (
  goal_id        SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  daily_goal_ml  INTEGER NOT NULL,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS water_intake (
  intake_id      SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_ml      INTEGER NOT NULL,
  intake_date    DATE NOT NULL,
  intake_time    TIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intake_user_date ON water_intake(user_id, intake_date);

CREATE TABLE IF NOT EXISTS reminder_settings (
  user_id          INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  start_time       TIME NOT NULL DEFAULT '08:00',
  end_time         TIME NOT NULL DEFAULT '22:00',
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
