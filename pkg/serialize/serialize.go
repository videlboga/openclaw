package serialize

import "encoding/json"

// MarshalFresh returns a fresh JSON encoding of v using a new encoder
// each call. This avoids reusing shared encoder state across goroutines.
func MarshalFresh(v interface{}) ([]byte, error) {
    return json.Marshal(v)
}
