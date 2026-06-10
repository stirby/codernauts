package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/stirby/codernauts/internal/game"
)

type Server struct {
	store       *game.Store
	openAPIPath string
}

func New(store *game.Store, openAPIPath string) *Server {
	return &Server{store: store, openAPIPath: openAPIPath}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	if s.openAPIPath != "" {
		mux.HandleFunc("GET /openapi/codernauts.yaml", s.openapi)
	}
	mux.HandleFunc("GET /v1/me", s.withAuth(s.me))
	mux.HandleFunc("GET /v1/status", s.withAuth(s.status))
	mux.HandleFunc("GET /v1/sector", s.withAuth(s.sector))
	mux.HandleFunc("GET /v1/leaderboard", s.withAuth(s.leaderboard))
	mux.HandleFunc("GET /v1/conversions", s.withAuth(s.conversions))
	mux.HandleFunc("POST /v1/conversions/{resource}", s.withAuth(s.convert))
	mux.HandleFunc("POST /v1/nodes/{id}/claim", s.withAuth(s.claimNode))
	mux.HandleFunc("POST /v1/crusher/upgrade", s.withAuth(s.upgradeCrusher))
	mux.HandleFunc("GET /v1/miners", s.withAuth(s.miners))
	mux.HandleFunc("POST /v1/miners", s.withAuth(s.buildMiner))
	mux.HandleFunc("POST /v1/miners/{id}/upgrade", s.withAuth(s.upgradeMiner))
	mux.HandleFunc("POST /v1/miners/{id}/assign", s.withAuth(s.assignMiner))
	mux.HandleFunc("GET /v1/actions", s.withAuth(s.actions))
	mux.HandleFunc("GET /v1/actions/{id}", s.withAuth(s.action))
	mux.HandleFunc("POST /v1/actions/scan", s.withAuth(s.scan))
	mux.HandleFunc("GET /v1/log", s.withAuth(s.log))
	return recoverer(cors(mux))
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   game.RealClock{}.Now(),
	})
}

func (s *Server) openapi(w http.ResponseWriter, _ *http.Request) {
	content, err := os.ReadFile(s.openAPIPath)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "OpenAPI document not found.", map[string]any{})
		return
	}
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(content); err != nil {
		panic(err)
	}
}

func (s *Server) me(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"player": s.store.Player()})
}

func (s *Server) status(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Status())
}

func (s *Server) sector(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Sector())
}

func (s *Server) leaderboard(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Leaderboard())
}

func (s *Server) conversions(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.ConversionsInfo())
}

type convertRequest struct {
	Amount *float64 `json:"amount"`
}

func (s *Server) convert(w http.ResponseWriter, r *http.Request) {
	var req convertRequest
	if r.Body != nil && r.ContentLength != 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", map[string]any{})
			return
		}
	}
	var amount *int
	if req.Amount != nil {
		if *req.Amount != math.Trunc(*req.Amount) {
			writeError(w, http.StatusBadRequest, "invalid_amount", "Conversion amount must be a whole number of at least 1.", map[string]any{
				"amount": *req.Amount,
			})
			return
		}
		value := int(*req.Amount)
		amount = &value
	}
	result, err := s.store.Convert(r.PathValue("resource"), amount, r.Header.Get("Idempotency-Key"))
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) claimNode(w http.ResponseWriter, r *http.Request) {
	node, err := s.store.ClaimNode(r.PathValue("id"), r.Header.Get("Idempotency-Key"))
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, node)
}

func (s *Server) upgradeCrusher(w http.ResponseWriter, _ *http.Request) {
	crusher, err := s.store.UpgradeCrusher()
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, crusher)
}

func (s *Server) miners(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"miners": s.store.Miners()})
}

func (s *Server) buildMiner(w http.ResponseWriter, _ *http.Request) {
	miner, err := s.store.BuildMiner()
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, miner)
}

func (s *Server) upgradeMiner(w http.ResponseWriter, r *http.Request) {
	miner, err := s.store.UpgradeMiner(r.PathValue("id"))
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, miner)
}

type assignMinerRequest struct {
	SiteID      string `json:"site_id"`
	SiteIDCamel string `json:"siteId"`
}

func (s *Server) assignMiner(w http.ResponseWriter, r *http.Request) {
	var req assignMinerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", map[string]any{})
		return
	}
	siteID := req.SiteID
	if siteID == "" {
		siteID = req.SiteIDCamel
	}
	if siteID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "site_id is required.", map[string]any{"field": "site_id"})
		return
	}
	miner, err := s.store.AssignMiner(r.PathValue("id"), siteID)
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, miner)
}

func (s *Server) actions(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"actions": s.store.Actions()})
}

func (s *Server) action(w http.ResponseWriter, r *http.Request) {
	action, err := s.store.Action(r.PathValue("id"))
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, action)
}

type scanRequest struct {
	Direction string `json:"direction"`
}

func (s *Server) scan(w http.ResponseWriter, r *http.Request) {
	var req scanRequest
	if r.Body != nil && r.ContentLength != 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.", map[string]any{})
			return
		}
	}
	action, err := s.store.StartScan(req.Direction, r.Header.Get("Idempotency-Key"))
	if err != nil {
		writeGameError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, action)
}

func (s *Server) log(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"log": s.store.Log()})
}

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		prefix, token, ok := strings.Cut(r.Header.Get("Authorization"), " ")
		if !ok || !strings.EqualFold(prefix, "Bearer") || !s.store.Authenticate(token) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "A valid bearer token is required.", map[string]any{})
			return
		}
		next(w, r)
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
		w.Header().Set("Access-Control-Max-Age", "600")
		w.Header().Add("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error.", map[string]any{})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		return fmt.Errorf("request body must contain a single JSON object")
	}
	return nil
}

func writeGameError(w http.ResponseWriter, err error) {
	var gameErr *game.Error
	if !errors.As(err, &gameErr) {
		writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error.", map[string]any{})
		return
	}
	status := http.StatusBadRequest
	switch gameErr.Code {
	case "not_found":
		status = http.StatusNotFound
	case "insufficient_resources", "energy_capacity_exceeded", "site_occupied", "active_scan_exists",
		"idempotency_conflict", "node_already_claimed", "node_not_claimed", "crusher_level_too_low":
		status = http.StatusConflict
	case "invalid_direction", "site_unavailable", "max_level", "invalid_resource", "invalid_amount":
		status = http.StatusBadRequest
	}
	writeError(w, status, gameErr.Code, gameErr.Message, gameErr.Details)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		panic(err)
	}
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details"`
}

func writeError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	if details == nil {
		details = map[string]any{}
	}
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message, Details: details}})
}
