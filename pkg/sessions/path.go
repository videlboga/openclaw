package sessions

import "path/filepath"

// NormalizeSessionPath returns a normalized filesystem path for a session
// that is namespaced by agent name.
func NormalizeSessionPath(agentName, sessionId string) string {
    p := filepath.Join("sessions", agentName, sessionId)
    return filepath.Clean(p)
}

// MatchesEitherPath returns true if candidate matches either the namespaced
// session path (sessions/<agent>/<session>) or the global session path
// (sessions/<session>).
func MatchesEitherPath(candidate, agentName, sessionId string) bool {
    cand := filepath.Clean(candidate)
    p1 := NormalizeSessionPath(agentName, sessionId)
    p2 := filepath.Clean(filepath.Join("sessions", sessionId))
    return cand == p1 || cand == p2
}
