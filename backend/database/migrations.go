package database

import "database/sql"

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email      TEXT UNIQUE NOT NULL,
			password   TEXT NOT NULL,
			role       TEXT NOT NULL DEFAULT 'user',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS tasks (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'todo',
			priority    TEXT NOT NULL DEFAULT 'medium',
			due_date    TIMESTAMPTZ,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
		CREATE INDEX IF NOT EXISTS tasks_status_idx  ON tasks(status);

		CREATE TABLE IF NOT EXISTS task_activities (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			task_id    UUID NOT NULL,
			user_id    UUID NOT NULL,
			action     TEXT NOT NULL,
			changes    TEXT NOT NULL DEFAULT '{}',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS activities_task_id_idx ON task_activities(task_id);

		CREATE TABLE IF NOT EXISTS task_attachments (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
			user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			file_name  TEXT NOT NULL,
			file_size  BIGINT NOT NULL,
			mime_type  TEXT NOT NULL,
			url        TEXT NOT NULL,
			key        TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS attachments_task_id_idx ON task_attachments(task_id);
	`)
	return err
}
