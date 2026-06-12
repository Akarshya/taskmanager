package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type SSEEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[string]chan SSEEvent // userID -> connID -> chan
}

var GlobalHub = &Hub{
	clients: make(map[string]map[string]chan SSEEvent),
}

func (h *Hub) subscribe(userID, connID string) chan SSEEvent {
	ch := make(chan SSEEvent, 16)
	h.mu.Lock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[string]chan SSEEvent)
	}
	h.clients[userID][connID] = ch
	h.mu.Unlock()
	return ch
}

func (h *Hub) unsubscribe(userID, connID string) {
	h.mu.Lock()
	if conns, ok := h.clients[userID]; ok {
		if ch, ok := conns[connID]; ok {
			close(ch)
			delete(conns, connID)
		}
		if len(conns) == 0 {
			delete(h.clients, userID)
		}
	}
	h.mu.Unlock()
}

// Broadcast sends an event to all connections of a user.
func (h *Hub) Broadcast(userID string, event SSEEvent) {
	h.mu.RLock()
	conns := h.clients[userID]
	h.mu.RUnlock()
	for _, ch := range conns {
		select {
		case ch <- event:
		default:
		}
	}
}

func SSEHandler(c *gin.Context) {
	userID := c.GetString("userID")
	connID := fmt.Sprintf("%d", time.Now().UnixNano())

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ch := GlobalHub.subscribe(userID, connID)
	defer GlobalHub.unsubscribe(userID, connID)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case event, ok := <-ch:
			if !ok {
				return false
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", data)
			return true
		case <-ticker.C:
			fmt.Fprintf(w, ": ping\n\n")
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}
