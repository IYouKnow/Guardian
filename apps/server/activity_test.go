package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func listActivity(t *testing.T, s *Server, query string) ([]ActivityEntry, int) {
	t.Helper()
	rec := httptest.NewRecorder()
	s.handleListActivity(rec, httptest.NewRequest(http.MethodGet, "/api/admin/activity"+query, nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var entries []ActivityEntry
	if err := json.Unmarshal(rec.Body.Bytes(), &entries); err != nil {
		t.Fatalf("decode activity: %v", err)
	}
	return entries, rec.Code
}

func TestActivityLogReturnsNewestFirst(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)

	s.recordActivity("alice", "signed in", "", "auth")
	s.recordActivity("alice", "generated an invite", "GRDN-AAAA-BBBB-CCCC-DDDD", "invite")

	entries, _ := listActivity(t, s, "")
	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2", len(entries))
	}
	if entries[0].Action != "generated an invite" || entries[1].Action != "signed in" {
		t.Errorf("entries not newest-first: %q, %q", entries[0].Action, entries[1].Action)
	}
	if entries[0].Target != "GRDN-AAAA-BBBB-CCCC-DDDD" || entries[0].Category != "invite" {
		t.Errorf("entry fields not persisted: %+v", entries[0])
	}
	if entries[0].CreatedAt.IsZero() {
		t.Error("created_at was not populated")
	}
}

func TestActivityLogLimit(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	for i := 0; i < 5; i++ {
		s.recordActivity("alice", "signed in", "", "auth")
	}

	entries, _ := listActivity(t, s, "?limit=2")
	if len(entries) != 2 {
		t.Errorf("limit=2 returned %d entries", len(entries))
	}

	// An out-of-range limit is clamped rather than rejected or unbounded.
	entries, _ = listActivity(t, s, "?limit=9999")
	if len(entries) != 5 {
		t.Errorf("clamped limit returned %d entries, want 5", len(entries))
	}
}
