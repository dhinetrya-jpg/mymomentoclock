module astroengine-core

go 1.22

require (
	github.com/lib/pq v1.10.9
	github.com/neo4j/neo4j-go-driver/v5 v5.18.0
	github.com/prometheus/client_golang v1.19.1
)

replace astroengine-core/backend => ./
