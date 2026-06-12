package services

import (
	"context"
	"database/sql"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"taskmanager/models"
)

const maxAttachmentSize = 10 << 20 // 10 MB

var allowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"image/webp":      true,
	"application/pdf": true,
	"text/plain":      true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

type AttachmentService struct {
	db  *sql.DB
	cld *cloudinary.Cloudinary
}

func NewAttachmentService(db *sql.DB, cloudName, apiKey, apiSecret string) *AttachmentService {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		cld = nil
	}
	return &AttachmentService{db: db, cld: cld}
}

func (s *AttachmentService) configured() bool {
	return s.cld != nil
}

func (s *AttachmentService) Upload(callerID, role, taskID string, fh *multipart.FileHeader) (*models.Attachment, error) {
	if !s.configured() {
		return nil, fmt.Errorf("file uploads are not configured")
	}
	if err := s.checkTaskAccess(callerID, role, taskID); err != nil {
		return nil, err
	}

	if fh.Size > maxAttachmentSize {
		return nil, fmt.Errorf("file exceeds 10 MB limit")
	}

	mimeType := fh.Header.Get("Content-Type")
	if !allowedMimeTypes[mimeType] {
		return nil, fmt.Errorf("unsupported file type: %s", mimeType)
	}

	file, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	resourceType := "raw"
	if strings.HasPrefix(mimeType, "image/") {
		resourceType = "image"
	}

	publicID := fmt.Sprintf("taskmanager/tasks/%s/%d", taskID, time.Now().UnixNano())

	result, err := s.cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		PublicID:     publicID,
		ResourceType: resourceType,
		Folder:       "taskmanager/tasks/" + taskID,
	})
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	// store resourceType:publicID so we can delete correctly later
	key := resourceType + ":" + result.PublicID

	var a models.Attachment
	err = s.db.QueryRow(
		`INSERT INTO task_attachments (task_id, user_id, file_name, file_size, mime_type, url, key)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, task_id, user_id, file_name, file_size, mime_type, url, key, created_at`,
		taskID, callerID, fh.Filename, fh.Size, mimeType, result.SecureURL, key,
	).Scan(&a.ID, &a.TaskID, &a.UserID, &a.FileName, &a.FileSize, &a.MimeType, &a.URL, &a.Key, &a.CreatedAt)
	if err != nil {
		s.deleteFromCloudinary(key) //nolint
		return nil, err
	}

	return &a, nil
}

func (s *AttachmentService) List(callerID, role, taskID string) ([]models.Attachment, error) {
	if err := s.checkTaskAccess(callerID, role, taskID); err != nil {
		return nil, err
	}

	rows, err := s.db.Query(
		`SELECT id, task_id, user_id, file_name, file_size, mime_type, url, key, created_at
		 FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC`, taskID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attachments := []models.Attachment{}
	for rows.Next() {
		var a models.Attachment
		rows.Scan(&a.ID, &a.TaskID, &a.UserID, &a.FileName, &a.FileSize, &a.MimeType, &a.URL, &a.Key, &a.CreatedAt) //nolint
		attachments = append(attachments, a)
	}
	return attachments, nil
}

func (s *AttachmentService) Delete(callerID, role, taskID, attachmentID string) error {
	if err := s.checkTaskAccess(callerID, role, taskID); err != nil {
		return err
	}

	var key, ownerID string
	err := s.db.QueryRow(
		`SELECT key, user_id FROM task_attachments WHERE id = $1 AND task_id = $2`,
		attachmentID, taskID,
	).Scan(&key, &ownerID)
	if err == sql.ErrNoRows {
		return ErrTaskNotFound
	}
	if err != nil {
		return err
	}
	if role != "admin" && ownerID != callerID {
		return ErrForbidden
	}

	s.deleteFromCloudinary(key) //nolint
	s.db.Exec(`DELETE FROM task_attachments WHERE id = $1`, attachmentID) //nolint
	return nil
}

func (s *AttachmentService) deleteFromCloudinary(key string) error {
	parts := strings.SplitN(key, ":", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid key format")
	}
	resourceType, publicID := parts[0], parts[1]
	_, err := s.cld.Upload.Destroy(context.Background(), uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: resourceType,
	})
	return err
}

func (s *AttachmentService) checkTaskAccess(callerID, role, taskID string) error {
	var ownerID string
	err := s.db.QueryRow(`SELECT user_id FROM tasks WHERE id = $1`, taskID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return ErrTaskNotFound
	}
	if err != nil {
		return err
	}
	if role != "admin" && ownerID != callerID {
		return ErrForbidden
	}
	return nil
}
