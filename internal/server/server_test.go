package server_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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

func (c *fakeClock) Advance(duration time.Duration) {
	c.now = c.now.Add(duration)
}

func newTestServer(t *testing.T) (http.Handler, *game.Store, *fakeClock) {
	t.Helper()
	clock := &fakeClock{now: time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)}
	store := game.NewStore(clock)
	return server.New(store, "").Handler(), store, clock
}

func doRequest(t *testing.T, handler http.Handler, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(payload)
	} else {
		reader = bytes.NewReader(nil)
	}
	request := httptest.NewRequest(method, path, reader)
	request.Header.Set("Authorization", "Bearer "+game.DevToken)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}

func decodeBody(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode body %q: %v", recorder.Body.String(), err)
	}
	return payload
}

func errorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	payload := decodeBody(t, recorder)
	errBody, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("error body missing in %q", recorder.Body.String())
	}
	code, _ := errBody["code"].(string)
	return code
}

func TestHealthRequiresNoAuth(t *testing.T) {
	handler, _, _ := newTestServer(t)
	request := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("health status = %d, want 200", recorder.Code)
	}
}

func TestAuthRequiredOnNewEndpoints(t *testing.T) {
	handler, _, _ := newTestServer(t)
	paths := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/v1/leaderboard"},
		{http.MethodGet, "/v1/conversions"},
		{http.MethodPost, "/v1/conversions/ore"},
		{http.MethodPost, "/v1/nodes/node_home/claim"},
		{http.MethodPost, "/v1/crusher/upgrade"},
	}
	for _, route := range paths {
		request := httptest.NewRequest(route.method, route.path, nil)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s status = %d, want 401", route.method, route.path, recorder.Code)
		}
	}
}

func TestStatusIncludesPhaseTwoShapes(t *testing.T) {
	handler, _, _ := newTestServer(t)
	recorder := doRequest(t, handler, http.MethodGet, "/v1/status", nil, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status code = %d, want 200", recorder.Code)
	}
	payload := decodeBody(t, recorder)

	gravel, ok := payload["gravel"].(map[string]any)
	if !ok {
		t.Fatalf("gravel missing in status: %v", payload)
	}
	if gravel["total"].(float64) != 0 {
		t.Fatalf("gravel total = %v, want 0", gravel["total"])
	}
	season := gravel["season"].(map[string]any)
	if season["id"] == "" || season["name"] == "" {
		t.Fatalf("season = %v, want id and name", season)
	}

	crusher, ok := payload["crusher"].(map[string]any)
	if !ok || crusher["name"] != "Crusher Mk I" {
		t.Fatalf("crusher = %v, want Crusher Mk I", payload["crusher"])
	}

	player := payload["player"].(map[string]any)
	location, ok := player["location"].(map[string]any)
	if !ok || location["node_id"] != "node_home" {
		t.Fatalf("player location = %v, want node_home", player["location"])
	}

	sector := payload["sector"].(map[string]any)
	nodes, ok := sector["nodes"].([]any)
	if !ok || len(nodes) != 1 {
		t.Fatalf("sector nodes = %v, want one home node", sector["nodes"])
	}
	home := nodes[0].(map[string]any)
	sites, ok := home["sites"].([]any)
	if !ok || len(sites) != 3 {
		t.Fatalf("home sites = %v, want 3", home["sites"])
	}

	resources := payload["resources"].(map[string]any)
	if _, hasMaxOre := resources["max_ore"]; hasMaxOre {
		t.Fatalf("resources still expose max_ore: %v", resources)
	}
	if _, hasRates := resources["rates_per_second"].(map[string]any); !hasRates {
		t.Fatalf("resources missing rates_per_second: %v", resources)
	}
}

func TestLeaderboardEndpoint(t *testing.T) {
	handler, _, _ := newTestServer(t)
	recorder := doRequest(t, handler, http.MethodGet, "/v1/leaderboard", nil, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("leaderboard status = %d, want 200", recorder.Code)
	}
	payload := decodeBody(t, recorder)
	entries, ok := payload["entries"].([]any)
	if !ok || len(entries) != 1 {
		t.Fatalf("entries = %v, want one entry", payload["entries"])
	}
	entry := entries[0].(map[string]any)
	if entry["rank"].(float64) != 1 || entry["is_you"] != true {
		t.Fatalf("entry = %v, want rank 1 and is_you", entry)
	}
	if entry["codernaut"] == "" {
		t.Fatalf("entry = %v, want codernaut name", entry)
	}
	if _, ok := payload["season"].(map[string]any); !ok {
		t.Fatalf("season missing: %v", payload)
	}
}

func TestConversionsEndpoint(t *testing.T) {
	handler, _, _ := newTestServer(t)
	recorder := doRequest(t, handler, http.MethodGet, "/v1/conversions", nil, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("conversions status = %d, want 200", recorder.Code)
	}
	payload := decodeBody(t, recorder)
	rates, ok := payload["rates"].([]any)
	if !ok || len(rates) != 4 {
		t.Fatalf("rates = %v, want 4", payload["rates"])
	}
	for _, raw := range rates {
		rate := raw.(map[string]any)
		switch rate["resource"] {
		case "ore", "ice":
			if rate["unlocked"] != true {
				t.Fatalf("rate %v, want unlocked", rate)
			}
		case "gas", "crystal":
			if rate["unlocked"] != false {
				t.Fatalf("rate %v, want locked", rate)
			}
		}
	}
}

func TestConvertEndpoint(t *testing.T) {
	handler, _, _ := newTestServer(t)
	recorder := doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 50}, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("convert status = %d, want 200: %s", recorder.Code, recorder.Body.String())
	}
	payload := decodeBody(t, recorder)
	if payload["amount_converted"].(float64) != 50 || payload["gravel_earned"].(float64) != 50 {
		t.Fatalf("conversion = %v, want 50 ore to 50 gravel", payload)
	}
	resources := payload["resources"].(map[string]any)
	if resources["ore"].(float64) != 300 {
		t.Fatalf("ore after conversion = %v, want 300", resources["ore"])
	}
}

func TestConvertEndpointErrors(t *testing.T) {
	handler, _, _ := newTestServer(t)

	recorder := doRequest(t, handler, http.MethodPost, "/v1/conversions/unobtanium", nil, nil)
	if recorder.Code != http.StatusBadRequest || errorCode(t, recorder) != "invalid_resource" {
		t.Fatalf("unknown resource = %d %s, want 400 invalid_resource", recorder.Code, recorder.Body.String())
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 1.5}, nil)
	if recorder.Code != http.StatusBadRequest || errorCode(t, recorder) != "invalid_amount" {
		t.Fatalf("fractional amount = %d %s, want 400 invalid_amount", recorder.Code, recorder.Body.String())
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 0}, nil)
	if recorder.Code != http.StatusBadRequest || errorCode(t, recorder) != "invalid_amount" {
		t.Fatalf("zero amount = %d %s, want 400 invalid_amount", recorder.Code, recorder.Body.String())
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/conversions/gas", nil, nil)
	if recorder.Code != http.StatusConflict || errorCode(t, recorder) != "crusher_level_too_low" {
		t.Fatalf("locked resource = %d %s, want 409 crusher_level_too_low", recorder.Code, recorder.Body.String())
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 100000}, nil)
	if recorder.Code != http.StatusConflict || errorCode(t, recorder) != "insufficient_resources" {
		t.Fatalf("oversized amount = %d %s, want 409 insufficient_resources", recorder.Code, recorder.Body.String())
	}
}

func TestClaimEndpoint(t *testing.T) {
	handler, store, clock := newTestServer(t)
	scanAndComplete(t, store, clock, "east")

	recorder := doRequest(t, handler, http.MethodPost, "/v1/nodes/node_east_1/claim", nil, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("claim status = %d, want 200: %s", recorder.Code, recorder.Body.String())
	}
	payload := decodeBody(t, recorder)
	if payload["claimed_by"] != "ply_dev" {
		t.Fatalf("claimed_by = %v, want ply_dev", payload["claimed_by"])
	}
	if _, stillPriced := payload["claim_cost"]; stillPriced {
		t.Fatalf("claim_cost still present after claim: %v", payload)
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/nodes/node_east_1/claim", nil, nil)
	if recorder.Code != http.StatusConflict || errorCode(t, recorder) != "node_already_claimed" {
		t.Fatalf("double claim = %d %s, want 409 node_already_claimed", recorder.Code, recorder.Body.String())
	}

	recorder = doRequest(t, handler, http.MethodPost, "/v1/nodes/node_phantom/claim", nil, nil)
	if recorder.Code != http.StatusNotFound || errorCode(t, recorder) != "not_found" {
		t.Fatalf("phantom claim = %d %s, want 404 not_found", recorder.Code, recorder.Body.String())
	}
}

func TestAssignOnUnclaimedNodeMapsToConflict(t *testing.T) {
	handler, store, clock := newTestServer(t)
	node := scanAndComplete(t, store, clock, "south")
	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}

	path := fmt.Sprintf("/v1/miners/%s/assign", miner.ID)
	recorder := doRequest(t, handler, http.MethodPost, path, map[string]any{"site_id": node.Sites[0].ID}, nil)
	if recorder.Code != http.StatusConflict || errorCode(t, recorder) != "node_not_claimed" {
		t.Fatalf("unclaimed assign = %d %s, want 409 node_not_claimed", recorder.Code, recorder.Body.String())
	}
}

func TestCrusherUpgradeEndpointInsufficient(t *testing.T) {
	handler, _, _ := newTestServer(t)
	recorder := doRequest(t, handler, http.MethodPost, "/v1/crusher/upgrade", nil, nil)
	if recorder.Code != http.StatusConflict || errorCode(t, recorder) != "insufficient_resources" {
		t.Fatalf("upgrade = %d %s, want 409 insufficient_resources", recorder.Code, recorder.Body.String())
	}
}

func TestScanResultReturnsDiscoveredNode(t *testing.T) {
	handler, _, clock := newTestServer(t)

	recorder := doRequest(t, handler, http.MethodPost, "/v1/actions/scan", map[string]any{"direction": "east"}, map[string]string{"Idempotency-Key": "server-scan"})
	if recorder.Code != http.StatusAccepted {
		t.Fatalf("scan status = %d, want 202", recorder.Code)
	}
	action := decodeBody(t, recorder)
	actionID := action["id"].(string)

	clock.Advance(16 * time.Second)
	recorder = doRequest(t, handler, http.MethodGet, "/v1/actions/"+actionID, nil, nil)
	completed := decodeBody(t, recorder)
	if completed["status"] != "completed" {
		t.Fatalf("action status = %v, want completed", completed["status"])
	}
	result := completed["result"].(map[string]any)
	node := result["discovered_node"].(map[string]any)
	if node["id"] != "node_east_1" {
		t.Fatalf("discovered node = %v, want node_east_1", node)
	}
}

func TestConvertIdempotencyKeyReplay(t *testing.T) {
	handler, _, _ := newTestServer(t)
	headers := map[string]string{"Idempotency-Key": "convert-replay"}

	first := doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 30}, headers)
	if first.Code != http.StatusOK {
		t.Fatalf("first convert = %d, want 200", first.Code)
	}
	replay := doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 30}, headers)
	if replay.Code != http.StatusOK {
		t.Fatalf("replay convert = %d, want 200", replay.Code)
	}
	firstPayload := decodeBody(t, first)
	replayPayload := decodeBody(t, replay)
	if firstPayload["gravel_total"].(float64) != replayPayload["gravel_total"].(float64) {
		t.Fatalf("replay gravel total = %v, want %v", replayPayload["gravel_total"], firstPayload["gravel_total"])
	}

	conflict := doRequest(t, handler, http.MethodPost, "/v1/conversions/ore", map[string]any{"amount": 99}, headers)
	if conflict.Code != http.StatusConflict || errorCode(t, conflict) != "idempotency_conflict" {
		t.Fatalf("conflicting replay = %d %s, want 409 idempotency_conflict", conflict.Code, conflict.Body.String())
	}
}

func TestCORSHeadersOnNewEndpoints(t *testing.T) {
	handler, _, _ := newTestServer(t)
	request := httptest.NewRequest(http.MethodOptions, "/v1/leaderboard", nil)
	request.Header.Set("Origin", "http://localhost:5174")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 204", recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5174" {
		t.Fatalf("allow origin = %q, want request origin", got)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Headers"); got != "Authorization, Content-Type, Idempotency-Key" {
		t.Fatalf("allow headers = %q", got)
	}
}

func scanAndComplete(t *testing.T, store *game.Store, clock *fakeClock, direction string) game.Node {
	t.Helper()
	action, err := store.StartScan(direction, "server-test-"+direction)
	if err != nil {
		t.Fatalf("start scan: %v", err)
	}
	clock.Advance(action.ResolvesAt.Sub(action.CreatedAt))
	completed, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("resolve scan: %v", err)
	}
	node, ok := completed.Result["discovered_node"].(game.Node)
	if !ok {
		t.Fatalf("scan result = %+v, want discovered_node", completed.Result)
	}
	return node
}
