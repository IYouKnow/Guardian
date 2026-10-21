package main

import (
	"net/http"
	"strconv"
	"time"
)

const (
	trafficDefaultDays = 7
	trafficMaxDays     = 90
	dayFormat          = "2006-01-02"
)

// TrafficPoint is one day of vault-platform traffic. Uploads counts vault items
// saved, downloads counts items served to clients, and signins counts logins.
type TrafficPoint struct {
	Day       string `json:"day"`
	Uploads   int    `json:"uploads"`
	Downloads int    `json:"downloads"`
	Signins   int    `json:"signins"`
}

// todayUTC is the bucket key traffic counters are grouped by. Everything is
// bucketed in UTC so the series is stable regardless of server timezone.
func todayUTC() string {
	return time.Now().UTC().Format(dayFormat)
}

// recordTraffic adds to today's counters. Editing the row with
// `column = column + excluded.column` keeps concurrent vault operations from
// clobbering each other's counts. Logging is best-effort.
func (s *Server) recordTraffic(uploads, downloads, signins int) {
	if _, err := s.systemDB.Exec(`
		INSERT INTO traffic_daily (day, uploads, downloads, signins) VALUES (?, ?, ?, ?)
		ON CONFLICT(day) DO UPDATE SET
			uploads   = uploads   + excluded.uploads,
			downloads = downloads + excluded.downloads,
			signins   = signins   + excluded.signins
	`, todayUTC(), uploads, downloads, signins); err != nil {
		s.logger.Println("recordTraffic:", err)
	}
}

// handleTraffic returns a continuous daily series for the last N days, oldest
// first. Days with no recorded traffic are emitted as zeros so the chart always
// has one point per day.
func (s *Server) handleTraffic(w http.ResponseWriter, r *http.Request) {
	days := trafficDefaultDays
	if v := r.URL.Query().Get("days"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			days = min(n, trafficMaxDays)
		}
	}

	since := time.Now().UTC().AddDate(0, 0, -(days - 1)).Format(dayFormat)
	rows, err := s.systemDB.Query(`
		SELECT day, uploads, downloads, signins FROM traffic_daily WHERE day >= ?
	`, since)
	if err != nil {
		s.logger.Println("handleTraffic: query error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	stored := make(map[string]TrafficPoint, days)
	for rows.Next() {
		var p TrafficPoint
		if err := rows.Scan(&p.Day, &p.Uploads, &p.Downloads, &p.Signins); err != nil {
			s.logger.Println("handleTraffic: scan error:", err)
			continue
		}
		stored[p.Day] = p
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "Database iteration error", http.StatusInternalServerError)
		return
	}

	today := time.Now().UTC()
	points := make([]TrafficPoint, 0, days)
	for i := days - 1; i >= 0; i-- {
		day := today.AddDate(0, 0, -i).Format(dayFormat)
		if p, ok := stored[day]; ok {
			points = append(points, p)
			continue
		}
		points = append(points, TrafficPoint{Day: day})
	}

	writeJSON(w, http.StatusOK, points)
}
