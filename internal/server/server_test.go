package server_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stirby/codernauts/internal/game"
	"github.com/stirby/codernauts/internal/server"
)

type fakeClock struct {
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	return c.now
}

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()
	clock := &fakeClock{now: time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)}
	return server.New(game.NewStore(clock), "").Handler()
}

func TestAuthBasics(t *testing.T) {
	handler := newTestHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/status", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status without token = %d, want %d", res.Code, http.StatusUnauthorized)
	}

	var errorBody struct {
		Error struct {
			Code    string         `json:"code"`
			Message string         `json:"message"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&errorBody); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if errorBody.Error.Code != "unauthorized" {
		t.Fatalf("error code = %q, want unauthorized", errorBody.Error.Code)
	}
	if errorBody.Error.Details == nil {
		t.Fatal("error details is nil")
	}

	req = httptest.NewRequest(http.MethodGet, "/v1/status", nil)
	req.Header.Set("Authorization", "Bearer dev-token")
	res = httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status with token = %d, want %d", res.Code, http.StatusOK)
	}
}

func TestHealthDoesNotRequireAuth(t *testing.T) {
	handler := newTestHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("health status = %d, want %d", res.Code, http.StatusOK)
	}
}

func TestCORSPreflight(t *testing.T) {
	handler := newTestHandler(t)
	req := httptest.NewRequest(http.MethodOptions, "/v1/status", nil)
	req.Header.Set("Origin", "http://127.0.0.1:5174")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want %d", res.Code, http.StatusNoContent)
	}
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:5174" {
		t.Fatalf("allow origin = %q", got)
	}
}

func TestAssignEndpointReportsEnergyCapacityConflict(t *testing.T) {
	clock := &fakeClock{now: time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)}
	store := game.NewStore(clock)
	handler := server.New(store, "").Handler()
	clock.now = clock.now.Add(500 * time.Second)
	prime := httptest.NewRequest(http.MethodGet, "/v1/status", nil)
	prime.Header.Set("Authorization", "Bearer dev-token")
	primeRes := httptest.NewRecorder()
	handler.ServeHTTP(primeRes, prime)
	if primeRes.Code != http.StatusOK {
		t.Fatalf("prime status = %d, want %d", primeRes.Code, http.StatusOK)
	}

	type builtMiner struct {
		ID string `json:"id"`
	}
	built := make([]builtMiner, 0, 3)
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/miners", nil)
		req.Header.Set("Authorization", "Bearer dev-token")
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusCreated {
			t.Fatalf("build miner status = %d, want %d", res.Code, http.StatusCreated)
		}
		var miner builtMiner
		if err := json.NewDecoder(res.Body).Decode(&miner); err != nil {
			t.Fatalf("decode built miner: %v", err)
		}
		built = append(built, miner)
	}

	firstSite := discoverSite(t, handler, clock, "east", "server-capacity-1")
	secondSite := discoverSite(t, handler, clock, "south", "server-capacity-2")
	thirdSite := discoverSite(t, handler, clock, "west", "server-capacity-3")
	assignMiner(t, handler, built[0].ID, firstSite, http.StatusOK)
	assignMiner(t, handler, built[1].ID, secondSite, http.StatusOK)
	res := assignMiner(t, handler, built[2].ID, thirdSite, http.StatusConflict)

	var errorBody struct {
		Error struct {
			Code    string         `json:"code"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&errorBody); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if errorBody.Error.Code != "energy_capacity_exceeded" {
		t.Fatalf("error code = %q, want energy_capacity_exceeded", errorBody.Error.Code)
	}
	if _, ok := errorBody.Error.Details["available_energy"]; !ok {
		t.Fatalf("error details missing available_energy: %+v", errorBody.Error.Details)
	}
}

func TestScanEndpointSupportsIdempotency(t *testing.T) {
	handler := newTestHandler(t)
	body := strings.NewReader(`{"direction":"north"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/actions/scan", body)
	req.Header.Set("Authorization", "Bearer dev-token")
	req.Header.Set("Idempotency-Key", "scan-key")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusAccepted {
		t.Fatalf("first scan status = %d, want %d", res.Code, http.StatusAccepted)
	}
	var first struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(res.Body).Decode(&first); err != nil {
		t.Fatalf("decode first scan: %v", err)
	}

	body = strings.NewReader(`{"direction":"north"}`)
	req = httptest.NewRequest(http.MethodPost, "/v1/actions/scan", body)
	req.Header.Set("Authorization", "Bearer dev-token")
	req.Header.Set("Idempotency-Key", "scan-key")
	res = httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusAccepted {
		t.Fatalf("second scan status = %d, want %d", res.Code, http.StatusAccepted)
	}
	var second struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(res.Body).Decode(&second); err != nil {
		t.Fatalf("decode second scan: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("second scan ID = %q, want %q", second.ID, first.ID)
	}
}

func discoverSite(t *testing.T, handler http.Handler, clock *fakeClock, direction, key string) string {
	t.Helper()
	body := strings.NewReader(`{"direction":"` + direction + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/actions/scan", body)
	req.Header.Set("Authorization", "Bearer dev-token")
	req.Header.Set("Idempotency-Key", key)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusAccepted {
		t.Fatalf("start scan status = %d, want %d", res.Code, http.StatusAccepted)
	}
	clock.now = clock.now.Add(game.ScanDuration)

	req = httptest.NewRequest(http.MethodGet, "/v1/sector", nil)
	req.Header.Set("Authorization", "Bearer dev-token")
	res = httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("sector status = %d, want %d", res.Code, http.StatusOK)
	}
	var sector game.Sector
	if err := json.NewDecoder(res.Body).Decode(&sector); err != nil {
		t.Fatalf("decode sector: %v", err)
	}
	return sector.Sites[len(sector.Sites)-1].ID
}

func assignMiner(t *testing.T, handler http.Handler, minerID, siteID string, wantStatus int) *httptest.ResponseRecorder {
	t.Helper()
	body := strings.NewReader(`{"site_id":"` + siteID + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/miners/"+minerID+"/assign", body)
	req.Header.Set("Authorization", "Bearer dev-token")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != wantStatus {
		t.Fatalf("assign status = %d, want %d", res.Code, wantStatus)
	}
	return res
}
