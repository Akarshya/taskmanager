package services

import (
	"context"
	"database/sql"
	"fmt"
	"mime/multipart"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
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
	db         *sql.DB
	s3Client   *s3.Client
	bucketName string
	region     string
}

func NewAttachmentService(db *sql.DB, accessKey, secretKey, region, bucketName string) *AttachmentService {
	if accessKey == "" || secretKey == "" || region == "" || bucketName == "" {
		return &AttachmentService{db: db}
	}

	staticCreds := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")
	s3Client := s3.NewFromConfig(aws.Config{
		Region:      region,
		Credentials: staticCreds,
	})

	return &AttachmentService{
		db:         db,
		s3Client:   s3Client,
		bucketName: bucketName,
		region:     region,
	}
}

func (s *AttachmentService) isConfigured() bool {
	return s.s3Client != nil
}

func (s *AttachmentService) Upload(callerID, role, taskID string, fh *multipart.FileHeader) (*models.Attachment, error) {
	if !s.isConfigured() {
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

	s3Key := fmt.Sprintf("taskmanager/tasks/%s/%d_%s", taskID, time.Now().UnixNano(), fh.Filename)

	_, err = s.s3Client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:             aws.String(s.bucketName),
		Key:                aws.String(s3Key),
		Body:               file,
		ContentType:        aws.String(mimeType),
		ContentDisposition: aws.String(fmt.Sprintf(`inline; filename="%s"`, fh.Filename)),
	})
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	fileURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, s.region, s3Key)

	var attachment models.Attachment
	err = s.db.QueryRow(
		`INSERT INTO task_attachments (task_id, user_id, file_name, file_size, mime_type, url, key)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, task_id, user_id, file_name, file_size, mime_type, url, key, created_at`,
		taskID, callerID, fh.Filename, fh.Size, mimeType, fileURL, s3Key,
	).Scan(&attachment.ID, &attachment.TaskID, &attachment.UserID, &attachment.FileName,
		&attachment.FileSize, &attachment.MimeType, &attachment.URL, &attachment.Key, &attachment.CreatedAt)
	if err != nil {
		s.deleteFromS3(s3Key) //nolint
		return nil, err
	}

	return &attachment, nil
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

	var s3Key, ownerID string
	err := s.db.QueryRow(
		`SELECT key, user_id FROM task_attachments WHERE id = $1 AND task_id = $2`,
		attachmentID, taskID,
	).Scan(&s3Key, &ownerID)
	if err == sql.ErrNoRows {
		return ErrTaskNotFound
	}
	if err != nil {
		return err
	}
	if role != "admin" && ownerID != callerID {
		return ErrForbidden
	}

	s.deleteFromS3(s3Key) //nolint
	s.db.Exec(`DELETE FROM task_attachments WHERE id = $1`, attachmentID) //nolint
	return nil
}

func (s *AttachmentService) deleteFromS3(key string) error {
	_, err := s.s3Client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
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
