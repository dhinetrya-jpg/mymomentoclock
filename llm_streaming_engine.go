package main

import (
	"context"
	"fmt"
	"io"
)

type UserDemographics struct {
	CurrentOccupation  string `json:"current_occupation"`
	GeographicLocation string `json:"geographic_location"`
	SocioEconomicEra   string `json:"socio_economic_era"`
}

type LLMContextPayload struct {
	CalculationMetrics ResolutionPayload `json:"calculation_metrics"`
	RemedialDirectives RVMOutputPayload  `json:"remedial_directives"`
	UserContext        UserDemographics  `json:"user_context"`
}

type StreamOrchestrator struct {
	APIEndpoint string
	APIKey      string
}

func (so *StreamOrchestrator) StreamContextualProse(ctx context.Context, payload LLMContextPayload, w io.Writer) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return fmt.Errorf("AI_UNAVAILABLE: explicit consent and verified calculation provenance are required")
}
