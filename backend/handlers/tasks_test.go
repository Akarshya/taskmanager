package handlers_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"taskmanager/config"
	"taskmanager/handlers"
	"taskmanager/middleware"
	"taskmanager/services"
)

func signupAndGetToken(t *testing.T, r http.Handler, email string) string {
	t.Helper()
	w := postJSON(r, "/auth/signup", map[string]string{"email": email, "password": "password123"})
	if w.Code != http.StatusCreated {
		t.Fatalf("signup failed: %d %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp) //nolint
	return resp["token"].(string)
}

func authedReq(method, path, token string, body interface{}) *http.Request {
	var req *http.Request
	if body != nil {
		b, _ := json.Marshal(body)
		buf := httptest.NewRecorder() // just to get an io.Reader
		_ = buf
		rb := &jsonReader{data: b}
		req, _ = http.NewRequest(method, path, rb)
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

type jsonReader struct {
	data []byte
	pos  int
}

func (r *jsonReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	return n, nil
}

func setupTaskRouter(t *testing.T) (http.Handler, func()) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	cfg := config.Load()

	r := gin.New()

	authH := handlers.NewAuthHandler(services.NewAuthService(db, cfg.JWTSecret))
	r.POST("/auth/signup", authH.Signup)

	taskH := handlers.NewTaskHandler(services.NewTaskService(db), handlers.GlobalHub)
	tasks := r.Group("/tasks")
	tasks.Use(middleware.RequireAuth(cfg.JWTSecret))
	tasks.POST("", taskH.Create)
	tasks.GET("", taskH.List)
	tasks.GET("/:id", taskH.GetByID)
	tasks.PATCH("/:id", taskH.Update)
	tasks.DELETE("/:id", taskH.Delete)

	cleanup := func() { db.Exec("DELETE FROM users WHERE email LIKE '%_tasktest@example.com'") } //nolint
	return r, cleanup
}

func TestTask_CreateAndGet(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "create_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{
		"title":    "Buy groceries",
		"priority": "high",
		"status":   "todo",
	}))
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var task map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &task) //nolint
	taskID := task["id"].(string)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, authedReq(http.MethodGet, "/tasks/"+taskID, token, nil))
	if w2.Code != http.StatusOK {
		t.Errorf("expected 200 on GET /:id, got %d", w2.Code)
	}
}

func TestTask_UpdateStatus(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "update_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{"title": "Fix bug"}))
	var task map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &task) //nolint
	taskID := task["id"].(string)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, authedReq(http.MethodPatch, "/tasks/"+taskID, token, map[string]interface{}{"status": "done"}))
	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 on PATCH, got %d: %s", w2.Code, w2.Body.String())
	}
	var updated map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &updated) //nolint
	if updated["status"] != "done" {
		t.Errorf("expected status=done, got %v", updated["status"])
	}
}

func TestTask_DeleteForbiddenForOtherUser(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	ownerToken := signupAndGetToken(t, r, "owner_tasktest@example.com")
	otherToken := signupAndGetToken(t, r, "other_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodPost, "/tasks", ownerToken, map[string]interface{}{"title": "Private task"}))
	var task map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &task) //nolint
	taskID := fmt.Sprintf("%v", task["id"])

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, authedReq(http.MethodDelete, "/tasks/"+taskID, otherToken, nil))
	if w2.Code != http.StatusForbidden {
		t.Errorf("expected 403 when other user deletes task, got %d", w2.Code)
	}
}

func TestTask_CreateValidation_EmptyTitle(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "validation_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{
		"title": "",
	}))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty title, got %d", w.Code)
	}
}

func TestTask_CreateValidation_InvalidStatus(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "badstatus_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{
		"title":  "Valid title",
		"status": "invalid_status",
	}))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid status, got %d", w.Code)
	}
}

func TestTask_GetByID_NotFound(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "notfound_tasktest@example.com")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodGet, "/tasks/00000000-0000-0000-0000-000000000000", token, nil))
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for non-existent task, got %d", w.Code)
	}
}

func TestTask_ListFiltersStatus(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "filter_tasktest@example.com")

	r.ServeHTTP(httptest.NewRecorder(), authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{"title": "Todo task", "status": "todo"}))
	r.ServeHTTP(httptest.NewRecorder(), authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{"title": "Done task", "status": "done"}))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodGet, "/tasks?status=done", token, nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on list, got %d", w.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result) //nolint
	tasks := result["data"].([]interface{})
	for _, item := range tasks {
		taskMap := item.(map[string]interface{})
		if taskMap["status"] != "done" {
			t.Errorf("expected all tasks to have status=done, got %v", taskMap["status"])
		}
	}
}

func TestTask_SearchByTitle(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	token := signupAndGetToken(t, r, "search_tasktest@example.com")

	r.ServeHTTP(httptest.NewRecorder(), authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{"title": "Buy groceries"}))
	r.ServeHTTP(httptest.NewRecorder(), authedReq(http.MethodPost, "/tasks", token, map[string]interface{}{"title": "Fix deployment bug"}))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, authedReq(http.MethodGet, "/tasks?search=groceries", token, nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result) //nolint
	tasks := result["data"].([]interface{})
	if len(tasks) != 1 {
		t.Errorf("expected 1 search result, got %d", len(tasks))
	}
	if tasks[0].(map[string]interface{})["title"] != "Buy groceries" {
		t.Errorf("expected 'Buy groceries' in results")
	}
}

func TestTask_UnauthenticatedRequest(t *testing.T) {
	r, cleanup := setupTaskRouter(t)
	defer cleanup()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/tasks", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", w.Code)
	}
}
