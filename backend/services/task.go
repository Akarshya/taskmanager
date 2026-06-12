package services

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"taskmanager/dto"
	"taskmanager/models"
)

var (
	ErrTaskNotFound = errors.New("task not found")
	ErrForbidden    = errors.New("access denied")
)

type TaskService struct {
	db *sql.DB
}

func NewTaskService(db *sql.DB) *TaskService {
	return &TaskService{db: db}
}

func (s *TaskService) Create(userID string, req dto.CreateTaskRequest) (*models.Task, error) {
	if req.Status == "" {
		req.Status = "todo"
	}
	if req.Priority == "" {
		req.Priority = "medium"
	}

	var task models.Task
	err := s.db.QueryRow(
		`INSERT INTO tasks (user_id, title, description, status, priority, due_date)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, title, description, status, priority, due_date, created_at, updated_at`,
		userID, req.Title, req.Description, req.Status, req.Priority, req.DueDate,
	).Scan(&task.ID, &task.UserID, &task.Title, &task.Description,
		&task.Status, &task.Priority, &task.DueDate, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, err
	}

	s.logActivity(task.ID, userID, "created", map[string]interface{}{"task": task})
	return &task, nil
}

func (s *TaskService) List(callerID, role string, q dto.ListTasksQuery) (*dto.TaskListResponse, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 || q.Limit > 100 {
		q.Limit = 10
	}
	offset := (q.Page - 1) * q.Limit

	sortBy := q.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortColumns := map[string]string{
		"created_at": "created_at",
		"due_date":   "due_date",
		"title":      "title",
	}
	sortColumn, ok := sortColumns[sortBy]
	if !ok && sortBy != "priority" {
		sortColumn = "created_at"
	}

	sortOrder := q.SortOrder
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	args := []interface{}{}
	conditions := []string{}
	argIdx := 1

	if role != "admin" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, callerID)
		argIdx++
	}
	if q.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, q.Status)
		argIdx++
	}
	if q.Search != "" {
		conditions = append(conditions, fmt.Sprintf("title ILIKE $%d", argIdx))
		args = append(args, "%"+q.Search+"%")
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	orderClause := fmt.Sprintf("%s %s", sortColumn, strings.ToUpper(sortOrder))
	if sortBy == "priority" {
		dir := "ASC"
		if sortOrder == "desc" {
			dir = "DESC"
		}
		orderClause = fmt.Sprintf(
			"CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END %s", dir)
	}

	var total int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	if err := s.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM tasks %s", where), countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, q.Limit, offset)
	rows, err := s.db.Query(fmt.Sprintf(
		`SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
		 FROM tasks %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		where, orderClause, argIdx, argIdx+1,
	), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := []models.Task{}
	for rows.Next() {
		var t models.Task
		rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description, //nolint
			&t.Status, &t.Priority, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
		tasks = append(tasks, t)
	}

	return &dto.TaskListResponse{
		Data:  tasks,
		Total: total,
		Page:  q.Page,
		Limit: q.Limit,
		Pages: (total + q.Limit - 1) / q.Limit,
	}, nil
}

func (s *TaskService) GetByID(callerID, role, id string) (*models.Task, error) {
	var task models.Task
	err := s.db.QueryRow(
		`SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
		 FROM tasks WHERE id = $1`, id,
	).Scan(&task.ID, &task.UserID, &task.Title, &task.Description,
		&task.Status, &task.Priority, &task.DueDate, &task.CreatedAt, &task.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrTaskNotFound
	}
	if err != nil {
		return nil, err
	}
	if role != "admin" && task.UserID != callerID {
		return nil, ErrForbidden
	}
	return &task, nil
}

func (s *TaskService) Update(callerID, role, id string, req dto.UpdateTaskRequest) (*models.Task, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT user_id FROM tasks WHERE id = $1`, id).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return nil, ErrTaskNotFound
	}
	if role != "admin" && ownerID != callerID {
		return nil, ErrForbidden
	}

	sets := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1
	changed := map[string]interface{}{}

	if req.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *req.Title)
		changed["title"] = *req.Title
		argIdx++
	}
	if req.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *req.Description)
		changed["description"] = *req.Description
		argIdx++
	}
	if req.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *req.Status)
		changed["status"] = *req.Status
		argIdx++
	}
	if req.Priority != nil {
		sets = append(sets, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *req.Priority)
		changed["priority"] = *req.Priority
		argIdx++
	}
	if req.DueDate != nil {
		sets = append(sets, fmt.Sprintf("due_date = $%d", argIdx))
		args = append(args, req.DueDate)
		changed["due_date"] = req.DueDate
		argIdx++
	}

	args = append(args, id)
	var task models.Task
	err = s.db.QueryRow(fmt.Sprintf(
		`UPDATE tasks SET %s WHERE id = $%d
		 RETURNING id, user_id, title, description, status, priority, due_date, created_at, updated_at`,
		strings.Join(sets, ", "), argIdx,
	), args...).Scan(&task.ID, &task.UserID, &task.Title, &task.Description,
		&task.Status, &task.Priority, &task.DueDate, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, err
	}

	s.logActivity(task.ID, callerID, "updated", changed)
	return &task, nil
}

func (s *TaskService) Delete(callerID, role, id string) error {
	var ownerID string
	err := s.db.QueryRow(`SELECT user_id FROM tasks WHERE id = $1`, id).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return ErrTaskNotFound
	}
	if role != "admin" && ownerID != callerID {
		return ErrForbidden
	}
	if _, err := s.db.Exec(`DELETE FROM tasks WHERE id = $1`, id); err != nil {
		return err
	}
	s.logActivity(id, callerID, "deleted", map[string]interface{}{"task_id": id})
	return nil
}

func (s *TaskService) GetActivities(callerID, role, taskID string) ([]models.Activity, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT user_id FROM tasks WHERE id = $1`, taskID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return nil, ErrTaskNotFound
	}
	if role != "admin" && ownerID != callerID {
		return nil, ErrForbidden
	}

	rows, err := s.db.Query(
		`SELECT id, task_id, user_id, action, changes, created_at
		 FROM task_activities WHERE task_id = $1 ORDER BY created_at DESC`, taskID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activities := []models.Activity{}
	for rows.Next() {
		var a models.Activity
		rows.Scan(&a.ID, &a.TaskID, &a.UserID, &a.Action, &a.Changes, &a.CreatedAt) //nolint
		activities = append(activities, a)
	}
	return activities, nil
}

func (s *TaskService) logActivity(taskID, userID, action string, changes map[string]interface{}) {
	b, _ := json.Marshal(changes)
	s.db.Exec( //nolint
		`INSERT INTO task_activities (task_id, user_id, action, changes) VALUES ($1, $2, $3, $4)`,
		taskID, userID, action, string(b),
	)
}
