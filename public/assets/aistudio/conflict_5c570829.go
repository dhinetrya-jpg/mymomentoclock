//go:build ignore

package resolver

import (
	"context"
	"encoding/json"
	"math"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type YogaRule struct {
	Name        string  `json:"yoga_name"`
	IsBenefic   bool    `json:"is_benefic"`
	RawStrength float64 `json:"raw_strength"`
}

type ResolutionPayload struct {
	Pillar            string  `json:"pillar"`
	NetPotencyScore   float64 `json:"net_potency_score"`
	NetAuspiciousness float64 `json:"net_auspiciousness_vector"`
	ConflictResolved  bool    `json:"conflict_resolved"`
	DominantVector    string  `json:"dominant_vector"`
}

func ResolveConflictMatrix(ctx context.Context, driver neo4j.DriverWithContext, userId string, targetCategory string) ([]byte, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		cypherQuery := `
			MATCH (u:UserChart {id: $userId})-[:HAS_PLANET_IN]->(p:Planet)
			MATCH (y:Yoga {category: $category})-[:REQUIRES_COMBINATION]->(p)
			RETURN y.name AS name, y.is_benefic AS is_benefic, SUM(p.sp_score) AS dynamic_strength`
		
		res, err := tx.Run(ctx, cypherQuery, map[string]any{"userId": userId, "category": targetCategory})
		if err != nil { return nil, err }

		var activeYogas []YogaRule
		for res.Next(ctx) {
			record := res.Record()
			name, _ := record.Get("name")
			isBenefic, _ := record.Get("is_benefic")
			strength, _ := record.Get("dynamic_strength")
			activeYogas = append(activeYogas, YogaRule{
				Name: name.(string), IsBenefic: isBenefic.(bool), RawStrength: strength.(float64),
			})
		}
		return activeYogas, nil
	})

	if err != nil { return nil, err }
	yogas := result.([]YogaRule)

	var positivePotency, negativePotency float64
	for _, yoga := range yogas {
		if yoga.IsBenefic { positivePotency += yoga.RawStrength * 100.0 } else { negativePotency += yoga.RawStrength * 100.0 }
	}

	netPotency := positivePotency - negativePotency
	mockDashaModulator := 0.85
	mockTransitModulator := 0.12

	netAuspiciousnessVector := (netPotency / 100.0) * (mockDashaModulator + mockTransitModulator)
	netAuspiciousnessVector = math.Max(0.0, math.Min(1.0, netAuspiciousnessVector))

	dominantVector := "MALEFIC_OBSTRUCTION_DOMINANT"
	if netPotency >= 0.0 { dominantVector = "BENEFIC_OPULENCE_DOMINANT" }

	payload := ResolutionPayload{
		Pillar:            targetCategory,
		NetPotencyScore:   netPotency,
		NetAuspiciousness: netAuspiciousnessVector,
		ConflictResolved:  true,
		DominantVector:    dominantVector,
	}
	return json.Marshal(payload)
}
