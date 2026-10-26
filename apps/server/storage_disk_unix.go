//go:build !windows

package main

import "golang.org/x/sys/unix"

// diskCapacity reports the total and available bytes of the volume holding dir.
// It is best-effort: the caller falls back to the configured allocation when it
// returns an error.
func diskCapacity(dir string) (int64, int64, error) {
	var st unix.Statfs_t
	if err := unix.Statfs(dir, &st); err != nil {
		return 0, 0, err
	}
	bsize := int64(st.Bsize)
	return int64(st.Blocks) * bsize, int64(st.Bavail) * bsize, nil
}
