use crate::error::GraphError;
use crate::graph::{Graph, IdentityId};
use std::collections::HashMap;

/// Configuration for the PageRank algorithm
#[derive(Debug, Clone)]
pub struct PageRankConfig {
    /// Damping factor (standard: 0.85)
    pub damping: f64,
    /// Convergence tolerance
    pub tolerance: f64,
    /// Maximum iterations
    pub max_iterations: usize,
    /// Time-decay half-life in days
    pub half_life_days: f64,
    /// SBT multiplier: each valid SBT adds this fraction to the base score
    pub sbt_multiplier: f64,
}

impl Default for PageRankConfig {
    fn default() -> Self {
        Self {
            damping: 0.85,
            tolerance: 1e-8,
            max_iterations: 100,
            half_life_days: 180.0,
            sbt_multiplier: 0.05,
        }
    }
}

/// Compute weighted, time-decayed PageRank scores for all nodes in a given context.
///
/// Returns a map of identityId => raw PageRank score.
///
/// The algorithm:
/// 1. Build the weight matrix using time-decayed edge weights.
/// 2. Normalise each node's outgoing weights so they sum to 1.
/// 3. Iterate: rank[v] = (1-d)/N + d * Σ_{u→v} rank[u] * w(u,v) / out_sum[u]
/// 4. Apply SBT multipliers as a post-processing step.
pub fn compute_pagerank(
    graph: &Graph,
    context: &str,
    config: &PageRankConfig,
) -> Result<HashMap<IdentityId, f64>, GraphError> {
    let node_ids: Vec<IdentityId> = {
        let mut ids = graph.nodes_in_context(context);
        // Include nodes that only appear as targets (no outgoing edges in context)
        for edge in graph.all_nodes() {
            let incoming = graph.incoming_edges(edge.identity_id, context);
            if !incoming.is_empty() && !ids.contains(&edge.identity_id) {
                ids.push(edge.identity_id);
            }
        }
        ids.sort();
        ids.dedup();
        ids
    };

    let n = node_ids.len();
    if n == 0 {
        return Ok(HashMap::new());
    }

    let index: HashMap<IdentityId, usize> = node_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (*id, i))
        .collect();

    // Build time-decayed weight matrix: transition_weights[from][to]
    let mut transition_weights: Vec<Vec<f64>> = vec![vec![0.0; n]; n];
    let mut out_sums: Vec<f64> = vec![0.0; n];

    for &from_id in &node_ids {
        let edges = graph.outgoing_edges(from_id, context);
        let from_idx = index[&from_id];
        for edge in edges {
            let to_idx = match index.get(&edge.to) {
                Some(&i) => i,
                None => continue,
            };
            let w = edge.decayed_weight(config.half_life_days);
            transition_weights[from_idx][to_idx] += w;
            out_sums[from_idx] += w;
        }
    }

    // Normalize rows
    for i in 0..n {
        if out_sums[i] > 0.0 {
            for weight in transition_weights[i].iter_mut().take(n) {
                *weight /= out_sums[i];
            }
        }
    }

    // PageRank iteration
    let init = 1.0 / n as f64;
    let mut ranks: Vec<f64> = vec![init; n];
    let teleport = (1.0 - config.damping) / n as f64;

    for iter in 0..config.max_iterations {
        let mut new_ranks: Vec<f64> = vec![teleport; n];
        for from_idx in 0..n {
            for to_idx in 0..n {
                new_ranks[to_idx] +=
                    config.damping * ranks[from_idx] * transition_weights[from_idx][to_idx];
            }
        }
        // Dangling nodes: nodes with no outgoing edges distribute equally
        let dangling_sum: f64 = node_ids
            .iter()
            .enumerate()
            .filter(|(i, _id)| out_sums[*i] == 0.0)
            .map(|(i, _)| ranks[i])
            .sum();
        let dangling_contrib = config.damping * dangling_sum / n as f64;
        for r in new_ranks.iter_mut() {
            *r += dangling_contrib;
        }

        // Check convergence
        let delta: f64 = ranks
            .iter()
            .zip(new_ranks.iter())
            .map(|(old, new)| (old - new).abs())
            .sum();

        ranks = new_ranks;

        if delta < config.tolerance {
            tracing::debug!(
                "PageRank converged in {} iterations (delta={})",
                iter + 1,
                delta
            );
            break;
        }

        if iter == config.max_iterations - 1 {
            tracing::warn!(
                "PageRank did not converge after {} iterations (delta={})",
                config.max_iterations,
                delta
            );
        }
    }

    // Apply SBT multiplier
    let mut result = HashMap::new();
    for (i, &id) in node_ids.iter().enumerate() {
        let sbt_count = graph.get_node(id).map(|n| n.sbt_count).unwrap_or(0);
        let multiplier = 1.0 + sbt_count as f64 * config.sbt_multiplier;
        result.insert(id, ranks[i] * multiplier);
    }

    Ok(result)
}

/// Normalise raw PageRank scores to [0, 1000] range for display.
pub fn normalize_scores(raw: &HashMap<IdentityId, f64>) -> HashMap<IdentityId, f64> {
    if raw.is_empty() {
        return HashMap::new();
    }
    let max = raw.values().cloned().fold(f64::NEG_INFINITY, f64::max);
    if max == 0.0 {
        return raw.keys().map(|k| (*k, 0.0)).collect();
    }
    raw.iter().map(|(k, &v)| (*k, (v / max) * 1000.0)).collect()
}

/// Compute rank percentiles for each identity.
pub fn compute_percentiles(raw: &HashMap<IdentityId, f64>) -> HashMap<IdentityId, f64> {
    if raw.is_empty() {
        return HashMap::new();
    }
    let mut sorted: Vec<f64> = raw.values().cloned().collect();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = sorted.len() as f64;
    raw.iter()
        .map(|(id, &score)| {
            // Count of elements <= score gives a 1-indexed rank
            let rank = sorted.partition_point(|&s| s <= score) as f64;
            (*id, rank / n * 100.0)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{Edge, Graph};

    fn build_test_graph() -> Graph {
        let g = Graph::new();
        // Simple chain: 1 → 2 → 3
        g.upsert_edge(Edge::new(1, 1, 2, 80, "defi").unwrap())
            .unwrap();
        g.upsert_edge(Edge::new(2, 2, 3, 60, "defi").unwrap())
            .unwrap();
        // Mutual link: 2 ↔ 3
        g.upsert_edge(Edge::new(3, 3, 2, 50, "defi").unwrap())
            .unwrap();
        g
    }

    #[test]
    fn test_pagerank_basic() {
        let g = build_test_graph();
        let config = PageRankConfig::default();
        let scores = compute_pagerank(&g, "defi", &config).unwrap();
        assert!(!scores.is_empty());
        // Nodes 2 and 3 (mutually linked) should have higher rank than node 1
        let s1 = scores[&1];
        let s2 = scores[&2];
        let s3 = scores[&3];
        assert!(s2 > s1, "node 2 should outrank node 1");
        assert!(s3 > s1, "node 3 should outrank node 1");
    }

    #[test]
    fn test_normalize_scores() {
        let mut raw = HashMap::new();
        raw.insert(1u64, 0.3);
        raw.insert(2u64, 0.6);
        raw.insert(3u64, 0.1);
        let normalized = normalize_scores(&raw);
        let max_val = normalized
            .values()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        assert!((max_val - 1000.0).abs() < 1e-6);
    }

    #[test]
    fn test_percentiles() {
        let mut raw = HashMap::new();
        raw.insert(1u64, 100.0);
        raw.insert(2u64, 200.0);
        raw.insert(3u64, 300.0);
        let pct = compute_percentiles(&raw);
        // Node 3 should be at 100th percentile
        assert_eq!(pct[&3] as u64, 100);
    }

    #[test]
    fn test_sbt_multiplier() {
        let g = build_test_graph();
        // Give node 1 many SBTs
        g.update_sbt_count(1, 10);
        let config = PageRankConfig {
            sbt_multiplier: 0.5,
            ..Default::default()
        };
        let scores = compute_pagerank(&g, "defi", &config).unwrap();
        // Node 1's score should be boosted significantly
        let raw_config = PageRankConfig {
            sbt_multiplier: 0.0,
            ..Default::default()
        };
        let raw_scores = compute_pagerank(&g, "defi", &raw_config).unwrap();
        assert!(scores[&1] > raw_scores[&1]);
    }

    #[test]
    fn test_empty_context() {
        let g = Graph::new();
        let config = PageRankConfig::default();
        let scores = compute_pagerank(&g, "nonexistent", &config).unwrap();
        assert!(scores.is_empty());
    }
}
