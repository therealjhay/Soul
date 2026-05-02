use crate::graph::{Graph, IdentityId};
use std::collections::{HashMap, HashSet};

/// Sybil detection configuration
#[derive(Debug, Clone)]
pub struct SybilConfig {
    /// Minimum number of unique attestors required to be considered non-sybil
    pub min_unique_attestors: usize,
    /// Maximum allowed clustering coefficient before penalising
    pub max_cluster_coefficient: f64,
    /// Score penalty factor applied to suspected Sybil nodes (0.0–1.0)
    pub penalty_factor: f64,
    /// Minimum number of outgoing attestations to be trusted
    pub min_outgoing: usize,
}

impl Default for SybilConfig {
    fn default() -> Self {
        Self {
            min_unique_attestors: 3,
            max_cluster_coefficient: 0.8,
            penalty_factor: 0.2,
            min_outgoing: 1,
        }
    }
}

/// Result of Sybil analysis for a single node
#[derive(Debug, Clone)]
pub struct SybilAnalysis {
    pub identity_id: IdentityId,
    pub is_suspected_sybil: bool,
    pub clustering_coefficient: f64,
    pub unique_attestors: usize,
    pub penalty_multiplier: f64,
}

/// Detects and penalises likely Sybil nodes in a given context.
pub struct SybilDetector {
    config: SybilConfig,
}

impl SybilDetector {
    pub fn new(config: SybilConfig) -> Self {
        Self { config }
    }

    /// Analyse all nodes in a context and return their Sybil analysis results.
    pub fn analyse(&self, graph: &Graph, context: &str) -> HashMap<IdentityId, SybilAnalysis> {
        // Collect all node IDs involved in this context (outgoing OR incoming edges)
        let mut node_ids: HashSet<IdentityId> =
            graph.nodes_in_context(context).into_iter().collect();
        // Also include nodes that only appear as targets
        for node in graph.all_nodes() {
            let id = node.identity_id;
            if !graph.incoming_edges(id, context).is_empty() {
                node_ids.insert(id);
            }
        }

        let mut results = HashMap::new();

        for &id in &node_ids {
            let incoming = graph.incoming_edges(id, context);
            let unique_attestors: HashSet<IdentityId> = incoming.iter().map(|e| e.from).collect();
            let n_unique = unique_attestors.len();

            let cc = self.clustering_coefficient(graph, id, context);

            let is_suspected = n_unique < self.config.min_unique_attestors
                || cc > self.config.max_cluster_coefficient;

            let penalty_multiplier = if is_suspected {
                self.config.penalty_factor
            } else {
                1.0
            };

            results.insert(
                id,
                SybilAnalysis {
                    identity_id: id,
                    is_suspected_sybil: is_suspected,
                    clustering_coefficient: cc,
                    unique_attestors: n_unique,
                    penalty_multiplier,
                },
            );
        }

        results
    }

    /// Apply Sybil penalties to a score map.
    pub fn apply_penalties(
        &self,
        scores: &HashMap<IdentityId, f64>,
        analysis: &HashMap<IdentityId, SybilAnalysis>,
    ) -> HashMap<IdentityId, f64> {
        scores
            .iter()
            .map(|(&id, &score)| {
                let mult = analysis
                    .get(&id)
                    .map(|a| a.penalty_multiplier)
                    .unwrap_or(1.0);
                (id, score * mult)
            })
            .collect()
    }

    /// Compute the local clustering coefficient for a node.
    /// CC = (number of edges among neighbours) / (k*(k-1))
    /// where k is the number of neighbours.
    fn clustering_coefficient(&self, graph: &Graph, id: IdentityId, context: &str) -> f64 {
        let neighbours: HashSet<IdentityId> = graph
            .outgoing_edges(id, context)
            .into_iter()
            .map(|e| e.to)
            .collect();

        let k = neighbours.len();
        if k < 2 {
            return 0.0;
        }

        let neighbours_vec: Vec<IdentityId> = neighbours.iter().copied().collect();
        let mut edge_count = 0usize;

        for i in 0..neighbours_vec.len() {
            for j in (i + 1)..neighbours_vec.len() {
                let a = neighbours_vec[i];
                let b = neighbours_vec[j];
                if graph.outgoing_edges(a, context).iter().any(|e| e.to == b)
                    || graph.outgoing_edges(b, context).iter().any(|e| e.to == a)
                {
                    edge_count += 1;
                }
            }
        }

        edge_count as f64 / (k * (k - 1) / 2) as f64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{Edge, Graph};

    #[test]
    fn test_sybil_detection_isolated_node() {
        let g = Graph::new();
        // Node 1 gets only 1 attestation — below threshold
        g.upsert_edge(Edge::new(1, 2, 1, 50, "defi").unwrap())
            .unwrap();

        let detector = SybilDetector::new(SybilConfig {
            min_unique_attestors: 3,
            ..Default::default()
        });
        let analysis = detector.analyse(&g, "defi");
        let result = analysis.get(&1).unwrap();
        assert!(result.is_suspected_sybil);
        assert_eq!(result.unique_attestors, 1);
    }

    #[test]
    fn test_sybil_detection_legitimate_node() {
        let g = Graph::new();
        // Node 10 gets 5 attestations from different identities
        for i in 1u64..=5 {
            g.upsert_edge(Edge::new(i * 100, i, 10, 50, "defi").unwrap())
                .unwrap();
        }

        let detector = SybilDetector::new(SybilConfig::default());
        let analysis = detector.analyse(&g, "defi");
        let result = analysis.get(&10).unwrap();
        assert!(!result.is_suspected_sybil);
        assert_eq!(result.unique_attestors, 5);
    }

    #[test]
    fn test_penalty_applied() {
        let g = Graph::new();
        g.upsert_edge(Edge::new(1, 2, 1, 50, "defi").unwrap())
            .unwrap();

        let detector = SybilDetector::new(SybilConfig {
            min_unique_attestors: 3,
            penalty_factor: 0.1,
            ..Default::default()
        });
        let analysis = detector.analyse(&g, "defi");
        let mut scores = HashMap::new();
        scores.insert(1u64, 1.0);
        let penalised = detector.apply_penalties(&scores, &analysis);
        assert!((penalised[&1] - 0.1).abs() < 1e-9);
    }
}
