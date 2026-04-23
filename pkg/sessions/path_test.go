package sessions

import "testing"

func TestNormalizeSessionPath(t *testing.T) {
    p := NormalizeSessionPath("agent-x", "sess-1")
    want := "sessions/agent-x/sess-1"
    if p != want {
        t.Fatalf("want %s got %s", want, p)
    }
}

func TestMatchesEitherPath(t *testing.T) {
    if !MatchesEitherPath("sessions/agent-x/sess-1", "agent-x", "sess-1") {
        t.Fatalf("should match namespaced path")
    }
    if !MatchesEitherPath("sessions/sess-1", "agent-x", "sess-1") {
        t.Fatalf("should match global session path")
    }
    if MatchesEitherPath("sessions/other/sess-1", "agent-x", "sess-1") {
        t.Fatalf("should not match unrelated path")
    }
}
