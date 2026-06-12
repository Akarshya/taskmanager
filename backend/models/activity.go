package models

import "time"

type Activity struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`  // created | updated | deleted
	Changes   string    `json:"changes"` // JSON string describing what changed
	CreatedAt time.Time `json:"created_at"`
}
