package routes

import (
	"github.com/gin-gonic/gin"
	"taskmanager/handlers"
	"taskmanager/middleware"
	"taskmanager/services"
)

func Register(r *gin.Engine, authSvc *services.AuthService, taskSvc *services.TaskService, attachSvc *services.AttachmentService, jwtSecret string) {
	authHandler := handlers.NewAuthHandler(authSvc)
	taskHandler := handlers.NewTaskHandler(taskSvc, handlers.GlobalHub)
	attachHandler := handlers.NewAttachmentHandler(attachSvc)

	r.POST("/auth/signup", authHandler.Signup)
	r.POST("/auth/login", authHandler.Login)

	protected := r.Group("")
	protected.Use(middleware.RequireAuth(jwtSecret))
	{
		protected.GET("/events", handlers.SSEHandler)

		tasks := protected.Group("/tasks")
		{
			tasks.POST("", taskHandler.Create)
			tasks.GET("", taskHandler.List)
			tasks.GET("/:id", taskHandler.GetByID)
			tasks.PATCH("/:id", taskHandler.Update)
			tasks.DELETE("/:id", taskHandler.Delete)
			tasks.GET("/:id/activities", taskHandler.GetActivities)
			tasks.POST("/:id/attachments", attachHandler.Upload)
			tasks.GET("/:id/attachments", attachHandler.List)
			tasks.DELETE("/:id/attachments/:attachmentID", attachHandler.Delete)
		}
	}
}
