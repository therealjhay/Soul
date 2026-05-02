use crate::error::GraphError;
use crate::graph::{Graph, IdentityId};
use crate::pagerank::{compute_pagerank, compute_percentiles, normalize_scores, PageRankConfig};
use crate::sybil::{SybilConfig, SybilDetector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Final reputation score for one identity in one context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationScore {
    pub identity_id: IdentityId,
    pub context: String,
    /// Raw PageRank score
    pub raw_score: f64,
    /// Normalized score in [0, 1000]
    pub normalized_score: f64,
    /// Rank percentile in [0, 100]
    pub percentile: f64,
    /// Whether this identity is flagged as suspected Sybil
    pub is_suspected_sybil: bool,
    /// Clustering coefficient
    pub clustering_coefficient: f64,
    /// Number of unique attestors
    pub unique_attestors: usize,
    pub computed_at: chrono::DateTime<chrono::Utc>,
}

/// Configuration for the full scoring engine
#[derive(Debug, Clone, Default)]
pub struct ScoringConfig {
    pub pagerank: PageRankConfig,
    pub sybil: SybilConfig,
}

/// Orchestrates graph scoring across all contexts
pub struct ScoringEngine {
    config: ScoringConfig,
}

impl ScoringEngine {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Compute reputation scores for all identities in a given context.
    pub fn compute_for_context(
        &self,
        graph: &Graph,
        context: &str,
    ) -> Result<Vec<ReputationScore>, GraphError> {
        // PageRank
        let raw = compute_pagerank(graph, context, &self.config.pagerank)?;
        let _normalized = normalize_scores(&raw);
        let _percentiles = compute_percentiles(&raw);

        // Sybil analysis
        let detector = SybilDetector::new(self.config.sybil.clone());
        let analysis = detector.analyse(graph, context);

        // Apply sybil penalties to raw scores
        let penalized = detector.apply_penalties(&raw, &analysis);
        let penalized_normalized = normalize_scores(&penalized);
        let penalized_percentiles = compute_percentiles(&penalized);

        let now = chrono::Utc::now();
        let scores = raw
            .keys()
            .map(|&id| {
                let sybil_info = analysis.get(&id);
                ReputationScore {
                    identity_id: id,
                    context: context.to_string(),
                    raw_score: penalized.get(&id).copied().unwrap_or(0.0),
                    normalized_score: penalized_normalized.get(&id).copied().unwrap_or(0.0),
                    percentile: penalized_percentiles.get(&id).copied().unwrap_or(0.0),
                    is_suspected_sybil: sybil_info.map(|s| s.is_suspected_sybil).unwrap_or(false),
                    clustering_coefficient: sybil_info
                        .map(|s| s.clustering_coefficient)
                        .unwrap_or(0.0),
                    unique_attestors: sybil_info.map(|s| s.unique_attestors).unwrap_or(0),
                    computed_at: now,
                }
            })
            .collect();

        Ok(scores)
    }

    /// Compute scores across ALL contexts in the graph.
    pub fn compute_all(
        &self,
        graph: &Graph,
    ) -> Result<HashMap<String, Vec<ReputationScore>>, GraphError> {
        let contexts = graph.contexts();
        let mut all = HashMap::new();
        for ctx in contexts {
            let scores = self.compute_for_context(graph, &ctx)?;
            all.insert(ctx, scores);
        }
        Ok(all)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{Edge, Graph};

    #[test]
    fn test_scoring_engine() {
        let g = Graph::new();
        for i in 1u64..=5 {
            g.upsert_edge(Edge::new(i, i, (i + 1) % 5 + 1, 70, "dao").unwrap())
                .unwrap();
        }

        let engine = ScoringEngine::new(ScoringConfig::default());
        let scores = engine.compute_for_context(&g, "dao").unwrap();
        assert!(!scores.is_empty());
        assert!(scores.iter().all(|s| s.normalized_score >= 0.0));
    }
}
