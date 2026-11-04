//go:build ignore

package graph

import (
	"context"
	"math"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type SubChartCoordinates struct {
	UserID    string             `json:"user_id"`
	Planets   map[string]float64 `json:"planets"`
	Ascendant float64            `json:"ascendant"`
}

func ComputeD1House(longitude float64, ascendant float64) int {
	planetSign := int(math.Floor(longitude/30.0)) + 1
	ascendantSign := int(math.Floor(ascendant/30.0)) + 1
	house := (planetSign - ascendantSign + 12) % 12
	if house == 0 { return 12 }
	return house
}

func ComputeD9House(longitude float64, ascendant float64) int {
	totalNavamshas := int(math.Floor(longitude / 3.333333))
	navamshaSign := (totalNavamshas % 12) + 1
	ascTotalNavamshas := int(math.Floor(ascendant / 3.333333))
	ascNavamshaSign := (ascTotalNavamshas % 12) + 1
	house := (navamshaSign - ascNavamshaSign + 12) % 12
	if house == 0 { return 12 }
	return house
}

func HydrateUserGraph(ctx context.Context, driver neo4j.DriverWithContext, data SubChartCoordinates) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryUser := `MERGE (u:UserChart {id: $userId}) SET u.updated_at = timestamp()`
		if _, err := tx.Run(ctx, queryUser, map[string]any{"userId": data.UserID}); err != nil { return nil, err }

		for name, long := range data.Planets {
			d1House := ComputeD1House(long, data.Ascendant)
			d9House := ComputeD9House(long, data.Ascendant)
			mockShadbala := 1.15
			mockBindus := 5
			functionalNature := 1.0
			if name == "saturn" || name == "mars" { functionalNature = -1.0 }

			spScore := (0.50 * mockShadbala) + (0.35 * (float64(mockBindus) / 8.0)) + (0.15 * functionalNature)

			queryPlanet := `
				MATCH (u:UserChart {id: $userId})
				MERGE (p:Planet {name: $planetName})
				SET p.shadbala = $shadbala, p.ashtakavarga_bindus = $bindus, p.functional_nature = $fnNature, p.sp_score = $spScore
				MERGE (h1:House {number: $d1Num, division: "D1"})
				MERGE (h9:House {number: $d9Num, division: "D9"})
				MERGE (u)-[:HAS_PLANET_IN]->(p)
				MERGE (p)-[:OCCUPIES {weight: 1.0}]->(h1)
				MERGE (p)-[:NAVAMSHA_OCCUPIES {weight: 1.0}]->(h9)`
			
			params := map[string]any{
				"userId": data.UserID, "planetName": name, "shadbala": mockShadbala,
				"bindus": mockBindus, "fnNature": functionalNature, "spScore": spScore,
				"d1Num": d1House, "d9Num": d9House,
			}
			if _, err := tx.Run(ctx, queryPlanet, params); err != nil { return nil, err }
		}
		return nil, nil
	})
	return err
}
