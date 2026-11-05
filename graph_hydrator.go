package main

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type SubChartCoordinates struct {
	UserID    string             `json:"user_id"`
	Planets   map[string]float64 `json:"planets"`
	Ascendant float64            `json:"ascendant"`
}

// Mutations remain disabled until an authenticated owner-scoped graph repository exists.
func HydrateUserGraph(ctx context.Context, driver neo4j.DriverWithContext, data SubChartCoordinates) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return fmt.Errorf("PROFILE_GRAPH_UNAVAILABLE")
}
