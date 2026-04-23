package serialize

import (
    "encoding/json"
    "fmt"
    "sync"
    "testing"
)

type sample struct {
    A int    `json:"a"`
    B string `json:"b"`
}

func TestMarshalFreshConcurrent(t *testing.T) {
    var wg sync.WaitGroup
    errs := make(chan error, 200)
    iterations := 100

    for i := 0; i < iterations; i++ {
        wg.Add(1)
        go func(i int) {
            defer wg.Done()
            s := sample{A: i, B: "ok"}
            b, err := MarshalFresh(s)
            if err != nil {
                errs <- err
                return
            }
            var s2 sample
            if err := json.Unmarshal(b, &s2); err != nil {
                errs <- err
                return
            }
            if s2.A != s.A || s2.B != s.B {
                errs <- fmt.Errorf("mismatch: got %+v want %+v", s2, s)
                return
            }
        }(i)
    }

    wg.Wait()
    close(errs)
    for err := range errs {
        t.Fatal(err)
    }
}
