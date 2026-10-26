package main

import "golang.org/x/sys/windows"

// diskCapacity reports the total and available bytes of the volume holding dir.
// It is best-effort: the caller falls back to the configured allocation when it
// returns an error.
func diskCapacity(dir string) (int64, int64, error) {
	pathPtr, err := windows.UTF16PtrFromString(dir)
	if err != nil {
		return 0, 0, err
	}
	var freeToCaller, total, totalFree uint64
	if err := windows.GetDiskFreeSpaceEx(pathPtr, &freeToCaller, &total, &totalFree); err != nil {
		return 0, 0, err
	}
	return int64(total), int64(freeToCaller), nil
}
