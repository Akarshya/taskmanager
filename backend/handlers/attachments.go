package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"taskmanager/services"
)

type AttachmentHandler struct {
	svc *services.AttachmentService
}

func NewAttachmentHandler(svc *services.AttachmentService) *AttachmentHandler {
	return &AttachmentHandler{svc: svc}
}

func (h *AttachmentHandler) Upload(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	attachment, err := h.svc.Upload(
		c.GetString("userID"),
		c.GetString("userRole"),
		c.Param("id"),
		fh,
	)
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

func (h *AttachmentHandler) List(c *gin.Context) {
	attachments, err := h.svc.List(
		c.GetString("userID"),
		c.GetString("userRole"),
		c.Param("id"),
	)
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attachments)
}

func (h *AttachmentHandler) Delete(c *gin.Context) {
	err := h.svc.Delete(
		c.GetString("userID"),
		c.GetString("userRole"),
		c.Param("id"),
		c.Param("attachmentID"),
	)
	if err != nil {
		c.JSON(serviceErrStatus(err), gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
