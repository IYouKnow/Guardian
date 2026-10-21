package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func getTraffic(t *testing.T, s *Server, query string) []TrafficPoint {
	t.Helper()
	rec := httptest.NewRecorder()
	s.handleTraffic(rec, httptest.NewRequest(http.MethodGet, "/api/admin/traffic"+query, nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var points []TrafficPoint
	if err := json.Unmarshal(rec.Body.Bytes(), &points); err != nil {
		t.Fatalf("decode traffic: %v", err)
	}
	return points
}

func TestTrafficSeriesIsZeroFilledOldestFirst(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.recordTraffic(3, 7, 1)

	points := getTraffic(t, s, "")
	if len(points) != trafficDefaultDays {
		t.Fatalf("got %d points, want %d", len(points), trafficDefaultDays)
	}

	today := points[len(points)-1]
	if today.Day != todayUTC() {
		t.Errorf("last point day = %q, want today %q", today.Day, todayUTC())
	}
	if today.Uploads != 3 || today.Downloads != 7 || today.Signins != 1 {
		t.Errorf("today = %+v, want uploads=3 downloads=7 signins=1", today)
	}

	// Earlier days have no traffic and must still be emitted, as zeros.
	if points[0].Uploads != 0 || points[0].Downloads != 0 || points[0].Signins != 0 {
		t.Errorf("oldest day should be zero-filled, got %+v", points[0])
	}
	// YYYY-MM-DD sorts lexicographically, so this checks oldest-first ordering.
	if points[0].Day >= points[len(points)-1].Day {
		t.Errorf("series not oldest-first: %q then %q", points[0].Day, points[len(points)-1].Day)
	}
}

func TestTrafficAccumulatesAndClampsDays(t *testing.T) {
	s, _ := newTestServer(t, "ACTIVE", 0)
	s.recordTraffic(1, 2, 3)
	s.recordTraffic(1, 2, 3)

	today := getTraffic(t, s, "")[trafficDefaultDays-1]
	if today.Uploads != 2 || today.Downloads != 4 || today.Signins != 6 {
		t.Errorf("counters did not accumulate: %+v", today)
	}

	if got := len(getTraffic(t, s, "?days=30")); got != 30 {
		t.Errorf("days=30 returned %d points, want 30", got)
	}
	if got := len(getTraffic(t, s, "?days=9999")); got != trafficMaxDays {
		t.Errorf("days=9999 returned %d points, want clamp to %d", got, trafficMaxDays)
	}
}
