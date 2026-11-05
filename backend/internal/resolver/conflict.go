package resolver

import (
	"context"
	"fmt"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// Authentication/ownership and source-reviewed decision rules are not implemented.
func ResolveConflictMatrix(ctx context.Context, driver neo4j.DriverWithContext, userID string, category string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("PROFILE_GRAPH_UNAVAILABLE")
}

type ResolutionPayload struct {
	AssessmentStatus string `json:"assessment_status"`
	ConflictStatus   string `json:"conflict_status"`
}
