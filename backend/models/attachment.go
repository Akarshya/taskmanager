package models

import "time"

type Attachment struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	FileName  string    `json:"file_name"`
	FileSize  int64     `json:"file_size"`
	MimeType  string    `json:"mime_type"`
	URL       string    `json:"url"`
	Key       string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}
