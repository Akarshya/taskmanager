package handlers_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"taskmanager/config"
	"taskmanager/database"
	"taskmanager/handlers"
	"taskmanager/services"
)

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	cfg := config.Load()
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		t.Skip("no database available:", err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatal("migrate:", err)
	}
	return db
}

func postJSON(r http.Handler, path string, body interface{}) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, path, bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func newAuthRouter(db *sql.DB) http.Handler {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()
	r := gin.New()
	h := handlers.NewAuthHandler(services.NewAuthService(db, cfg.JWTSecret))
	r.POST("/auth/signup", h.Signup)
	r.POST("/auth/login", h.Login)
	return r
}

func TestSignup_Success(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { db.Exec("DELETE FROM users WHERE email = 'signup_test@example.com'") }) //nolint

	w := postJSON(newAuthRouter(db), "/auth/signup",
		map[string]string{"email": "signup_test@example.com", "password": "password123"})

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp) //nolint
	if resp["token"] == nil {
		t.Error("expected token in response")
	}
}

func TestSignup_DuplicateEmail(t *testing.T) {
	db := setupTestDB(t)
	t.Cleanup(func() { db.Exec("DELETE FROM users WHERE email = 'dup_test@example.com'") }) //nolint

	r := newAuthRouter(db)
	payload := map[string]string{"email": "dup_test@example.com", "password": "password123"}
	postJSON(r, "/auth/signup", payload)

	w := postJSON(r, "/auth/signup", payload)
	if w.Code != http.StatusConflict {
		t.Errorf("expected 409 on duplicate, got %d", w.Code)
	}
}

func TestLogin_InvalidCredentials(t *testing.T) {
	db := setupTestDB(t)

	w := postJSON(newAuthRouter(db), "/auth/login",
		map[string]string{"email": "nobody@example.com", "password": "wrongpassword"})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSignup_WeakPassword(t *testing.T) {
	db := setupTestDB(t)

	w := postJSON(newAuthRouter(db), "/auth/signup",
		map[string]string{"email": "weak@example.com", "password": "short"})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for short password, got %d", w.Code)
	}
}
