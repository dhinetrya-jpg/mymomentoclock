// ============================================================================
// MYMOMENTOCLOCK NEO4J GRAPH SCHEMA & CYPHER QUERIES (graph_hydrator.cypher)
// Implements Symbolic Reasoning Engine nodes, relations, and conflict resolution
// ============================================================================

// Constraints
CREATE CONSTRAINT user_chart_id IF NOT EXISTS FOR (u:UserChart) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT planet_name IF NOT EXISTS FOR (p:Planet) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT house_num IF NOT EXISTS FOR (h:House) REQUIRE h.number IS UNIQUE;
CREATE CONSTRAINT yoga_name IF NOT EXISTS FOR (y:Yoga) REQUIRE y.name IS UNIQUE;

// 1. Seed Planets and Houses
MERGE (jup:Planet {name: "Jupiter", shadbala: 1.45, ashtakavarga_bindus: 6, functional_nature: 1.0});
MERGE (sat:Planet {name: "Saturn", shadbala: 0.95, ashtakavarga_bindus: 3, functional_nature: -1.0});
MERGE (ven:Planet {name: "Venus", shadbala: 1.30, ashtakavarga_bindus: 7, functional_nature: 1.0});
MERGE (mer:Planet {name: "Mercury", shadbala: 1.15, ashtakavarga_bindus: 5, functional_nature: 0.5});
MERGE (sun:Planet {name: "Sun", shadbala: 1.20, ashtakavarga_bindus: 5, functional_nature: 0.8});
MERGE (moo:Planet {name: "Moon", shadbala: 1.35, ashtakavarga_bindus: 6, functional_nature: 1.0});
MERGE (mar:Planet {name: "Mars", shadbala: 1.10, ashtakavarga_bindus: 4, functional_nature: -0.5});

// Seed Yogas
MERGE (y1:Yoga {name: "Dhana_Yoga", base_potency: 100, category: "Wealth", nature: "Benefic"});
MERGE (y2:Yoga {name: "Daridra_Yoga", base_potency: 75, category: "Wealth", nature: "Malefic"});
MERGE (y3:Yoga {name: "Gajakesari_Yoga", base_potency: 90, category: "Career", nature: "Benefic"});
MERGE (y4:Yoga {name: "Lakshmi_Yoga", base_potency: 95, category: "Wealth", nature: "Benefic"});

// Wire Yoga requirement combinations
MERGE (y1)-[:REQUIRES_COMBINATION]->(jup);
MERGE (y1)-[:REQUIRES_COMBINATION]->(ven);
MERGE (y2)-[:REQUIRES_COMBINATION]->(sat);
MERGE (y3)-[:REQUIRES_COMBINATION]->(jup);
MERGE (y3)-[:REQUIRES_COMBINATION]->(moo);

// Dynamic Yoga Potency Evaluation Cypher Query (from SRS):
// MATCH (u:UserChart {id: $user_id})-[:HAS_PROFILE]->(p:Planet)
// MATCH (p)-[r:OCCUPIES|ASPECTS]->(h:House)
// MATCH (y:Yoga)-[:REQUIRES_COMBINATION]->(p)
// WHERE y.category = "Wealth"
// WITH y, p, r, h,
//  ((0.50 * p.shadbala) + (0.35 * p.ashtakavarga_bindus / 8.0) + (0.15 * p.functional_nature)) AS planet_functional_score
// RETURN y.name AS yoga_name,
//  y.base_potency AS base_potency,
//  SUM(planet_functional_score * r.weight * h.base_vibhuti) AS calculated_yoga_strength
// ORDER BY calculated_yoga_strength DESC;
