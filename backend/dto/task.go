package dto

import "time"

type CreateTaskRequest struct {
	Title       string     `json:"title"       binding:"required,min=1,max=255"`
	Description string     `json:"description"`
	Status      string     `json:"status"      binding:"omitempty,oneof=todo in_progress done"`
	Priority    string     `json:"priority"    binding:"omitempty,oneof=low medium high"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateTaskRequest struct {
	Title       *string    `json:"title"       binding:"omitempty,min=1,max=255"`
	Description *string    `json:"description"`
	Status      *string    `json:"status"      binding:"omitempty,oneof=todo in_progress done"`
	Priority    *string    `json:"priority"    binding:"omitempty,oneof=low medium high"`
	DueDate     *time.Time `json:"due_date"`
}

type ListTasksQuery struct {
	Page      int    `form:"page"       binding:"omitempty,min=1"`
	Limit     int    `form:"limit"      binding:"omitempty,min=1,max=100"`
	Status    string `form:"status"     binding:"omitempty,oneof=todo in_progress done"`
	Search    string `form:"search"`
	SortBy    string `form:"sort_by"    binding:"omitempty,oneof=due_date priority created_at title"`
	SortOrder string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

type TaskListResponse struct {
	Data  interface{} `json:"data"`
	Total int         `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
	Pages int         `json:"pages"`
}
