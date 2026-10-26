package main

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"
)

// --- Storage ---

const (
	storageAllocationSetting = "storage_allocation_gb"
	storageCapacitySetting   = "storage_capacity_source"
	storageCapacityDisk      = "disk"
	storageGrowthMonths      = 6
	storageMonthFormat       = "2006-01"
	bytesPerGB               = 1024 * 1024 * 1024
)

type storageBreakdownItem struct {
	Name  string `json:"name"`
	Bytes int64  `json:"bytes"`
}

type storageUser struct {
	ID            int    `json:"id"`
	Username      string `json:"username"`
	FriendlyName  string `json:"friendly_name"`
	Role          string `json:"role"`
	Status        string `json:"status"`
	DBBytes       int64  `json:"db_bytes"`
	OverheadBytes int64  `json:"overhead_bytes"`
	TotalBytes    int64  `json:"total_bytes"`
}

type storageGrowthPoint struct {
	Month string `json:"month"`
	Bytes int64  `json:"bytes"`
}

type storageResponse struct {
	TotalUsed       int64                  `json:"total_used"`
	AllocationBytes int64                  `json:"allocation_bytes"`
	CapacitySource  string                 `json:"capacity_source"`
	DiskTotal       int64                  `json:"disk_total"`
	DiskFree        int64                  `json:"disk_free"`
	Breakdown       []storageBreakdownItem `json:"breakdown"`
	Users           []storageUser          `json:"users"`
	Growth          []storageGrowthPoint   `json:"growth"`
}

// fileSizes returns the size of a SQLite database file and the combined size of
// its -wal and -shm sidecar files. A missing file counts as zero.
func fileSizes(path string) (main int64, overhead int64) {
	if info, err := os.Stat(path); err == nil {
		main = info.Size()
	}
	for _, suffix := range []string{"-wal", "-shm"} {
		if info, err := os.Stat(path + suffix); err == nil {
			overhead += info.Size()
		}
	}
	return main, overhead
}

// dirSize sums the size of every regular file under dir, recursively. A missing
// directory yields zero.
func dirSize(dir string) int64 {
	var total int64
	filepath.WalkDir(dir, func(_ string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if info, err := d.Info(); err == nil {
			total += info.Size()
		}
		return nil
	})
	return total
}

// settingValue reads a server_settings value, returning "" when unset.
func (s *Server) settingValue(key string) string {
	var v string
	if err := s.systemDB.QueryRow("SELECT value FROM server_settings WHERE key = ?", key).Scan(&v); err != nil {
		return ""
	}
	return v
}

// storageUsers reports each account's on-disk vault footprint, largest first.
func (s *Server) storageUsers() ([]storageUser, error) {
	rows, err := s.systemDB.Query(`
		SELECT id, username, friendly_name, role, status, db_path
		FROM users
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []storageUser{}
	for rows.Next() {
		var u storageUser
		var dbPath string
		if err := rows.Scan(&u.ID, &u.Username, &u.FriendlyName, &u.Role, &u.Status, &dbPath); err != nil {
			s.logger.Println("storageUsers: scan error:", err)
			continue
		}
		u.DBBytes, u.OverheadBytes = fileSizes(filepath.Join(s.config.DataDir, dbPath))
		u.TotalBytes = u.DBBytes + u.OverheadBytes
		list = append(list, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	sort.Slice(list, func(i, j int) bool { return list[i].TotalBytes > list[j].TotalBytes })
	return list, nil
}

// storageGrowth returns cumulative backup-archive bytes per month for the last
// storageGrowthMonths months, oldest first. Months with no archives are emitted
// as zero so the chart always has one point per month.
func (s *Server) storageGrowth() ([]storageGrowthPoint, error) {
	rows, err := s.systemDB.Query(`
		SELECT strftime('%Y-%m', created_at) AS month, SUM(size) AS bytes
		FROM backups
		GROUP BY month
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	perMonth := map[string]int64{}
	for rows.Next() {
		var month string
		var bytes int64
		if err := rows.Scan(&month, &bytes); err != nil {
			continue
		}
		perMonth[month] = bytes
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	growth := make([]storageGrowthPoint, 0, storageGrowthMonths)
	var cumulative int64
	for i := storageGrowthMonths - 1; i >= 0; i-- {
		month := now.AddDate(0, -i, 0).Format(storageMonthFormat)
		cumulative += perMonth[month]
		growth = append(growth, storageGrowthPoint{Month: month, Bytes: cumulative})
	}
	return growth, nil
}

// handleStorage reports on-disk storage across every vault database, the backup
// archives, and the system database. Sizes are raw bytes so the client can
// format and ratio them; the capacity denominator is the operator's configured
// allocation, or the real data-volume capacity when disk mode is selected.
func (s *Server) handleStorage(w http.ResponseWriter, r *http.Request) {
	users, err := s.storageUsers()
	if err != nil {
		s.logger.Println("handleStorage: users error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var vaultBytes, overheadBytes int64
	for _, u := range users {
		vaultBytes += u.DBBytes
		overheadBytes += u.OverheadBytes
	}

	systemBytes, systemOverhead := fileSizes(filepath.Join(s.config.DataDir, "system.db"))

	breakdown := []storageBreakdownItem{
		{Name: "Vault data", Bytes: vaultBytes},
		{Name: "Backups", Bytes: dirSize(s.snapshotDir())},
		{Name: "Overhead", Bytes: overheadBytes},
		{Name: "System", Bytes: systemBytes + systemOverhead},
	}
	var total int64
	for _, b := range breakdown {
		total += b.Bytes
	}

	allocationGB, _ := strconv.ParseInt(s.settingValue(storageAllocationSetting), 10, 64)
	capacitySource := s.settingValue(storageCapacitySetting)
	if capacitySource != storageCapacityDisk {
		capacitySource = "allocation"
	}

	var diskTotal, diskFree int64
	if dt, df, err := diskCapacity(s.config.DataDir); err == nil {
		diskTotal, diskFree = dt, df
	} else {
		s.logger.Println("handleStorage: disk capacity unavailable:", err)
	}

	growth, err := s.storageGrowth()
	if err != nil {
		s.logger.Println("handleStorage: growth error:", err)
	}

	writeJSON(w, http.StatusOK, storageResponse{
		TotalUsed:       total,
		AllocationBytes: allocationGB * bytesPerGB,
		CapacitySource:  capacitySource,
		DiskTotal:       diskTotal,
		DiskFree:        diskFree,
		Breakdown:       breakdown,
		Users:           users,
		Growth:          growth,
	})
}
