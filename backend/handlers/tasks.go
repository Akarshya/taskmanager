package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"taskmanager/dto"
	"taskmanager/services"
)

type TaskHandler struct {
	svc *services.TaskService
	hub *Hub
}

func NewTaskHandler(svc *services.TaskService, hub *Hub) *TaskHandler {
	return &TaskHandler{svc: svc, hub: hub}
}

func (h *TaskHandler) Create(c *gin.Context) {
	var req dto.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	task, err := h.svc.Create(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create task"})
		return
	}

	h.hub.Broadcast(userID, SSEEvent{Type: "task.created", Data: task})
	c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) List(c *gin.Context) {
	var q dto.ListTasksQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.svc.List(c.GetString("userID"), c.GetString("userRole"), q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch tasks"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *TaskHandler) GetByID(c *gin.Context) {
	task, err := h.svc.GetByID(c.GetString("userID"), c.GetString("userRole"), c.Param("id"))
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Update(c *gin.Context) {
	var req dto.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	task, err := h.svc.Update(userID, c.GetString("userRole"), c.Param("id"), req)
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}

	h.hub.Broadcast(task.UserID, SSEEvent{Type: "task.updated", Data: task})
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("userID")

	if err := h.svc.Delete(userID, c.GetString("userRole"), id); err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}

	h.hub.Broadcast(userID, SSEEvent{Type: "task.deleted", Data: gin.H{"id": id}})
	c.Status(http.StatusNoContent)
}

func (h *TaskHandler) GetActivities(c *gin.Context) {
	activities, err := h.svc.GetActivities(c.GetString("userID"), c.GetString("userRole"), c.Param("id"))
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}

func serviceErrStatus(err error) int {
	switch {
	case errors.Is(err, services.ErrTaskNotFound):
		return http.StatusNotFound
	case errors.Is(err, services.ErrForbidden):
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
}
