use crate::error::GraphError;
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Unique identity ID (mirrors on-chain identityId)
pub type IdentityId = u64;

/// A node in the reputation graph representing one identity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub identity_id: IdentityId,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub active: bool,
    /// Number of valid SBTs held (used as scoring multiplier)
    pub sbt_count: u32,
}

impl Node {
    pub fn new(identity_id: IdentityId) -> Self {
        let now = Utc::now();
        Self {
            identity_id,
            created_at: now,
            updated_at: now,
            active: true,
            sbt_count: 0,
        }
    }
}

/// A directed, weighted edge representing an attestation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub attestation_id: u64,
    pub from: IdentityId,
    pub to: IdentityId,
    /// Normalized weight in [0.0, 1.0]
    pub weight: f64,
    /// Raw on-chain weight (1-100)
    pub raw_weight: u8,
    pub context: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub revoked: bool,
}

impl Edge {
    pub fn new(
        attestation_id: u64,
        from: IdentityId,
        to: IdentityId,
        raw_weight: u8,
        context: &str,
    ) -> Result<Self, GraphError> {
        if from == to {
            return Err(GraphError::SelfLoop(from));
        }
        if !(1..=100).contains(&raw_weight) {
            return Err(GraphError::InvalidWeight(raw_weight as f64, 1.0, 100.0));
        }
        let now = Utc::now();
        Ok(Self {
            attestation_id,
            from,
            to,
            weight: raw_weight as f64 / 100.0,
            raw_weight,
            context: context.to_string(),
            created_at: now,
            updated_at: now,
            revoked: false,
        })
    }

    /// Compute time-decayed effective weight.
    /// Uses exponential decay: w * exp(-λ * age_days)
    /// with λ = ln(2) / half_life_days (default half_life = 180 days).
    pub fn decayed_weight(&self, half_life_days: f64) -> f64 {
        let age_seconds = (Utc::now() - self.created_at).num_seconds() as f64;
        let age_days = age_seconds / 86_400.0;
        let lambda = std::f64::consts::LN_2 / half_life_days;
        self.weight * (-lambda * age_days).exp()
    }
}

/// Partitioned graph context (e.g. "defi", "dao", "social")
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphContext {
    pub name: String,
    /// Adjacency: from_id => list of edge keys (attestation_id)
    pub adjacency: HashMap<IdentityId, HashSet<u64>>,
    /// Reverse adjacency: to_id => list of edge keys
    pub reverse_adjacency: HashMap<IdentityId, HashSet<u64>>,
}

impl GraphContext {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            adjacency: HashMap::new(),
            reverse_adjacency: HashMap::new(),
        }
    }
}

/// Main graph structure — thread-safe via DashMap
pub struct Graph {
    /// All nodes
    nodes: DashMap<IdentityId, Node>,
    /// All edges keyed by attestation_id
    edges: DashMap<u64, Edge>,
    /// Context partitions
    contexts: DashMap<String, GraphContext>,
}

impl Graph {
    pub fn new() -> Self {
        Self {
            nodes: DashMap::new(),
            edges: DashMap::new(),
            contexts: DashMap::new(),
        }
    }

    // ─── Node operations ──────────────────────────────────────────────────────

    pub fn upsert_node(&self, identity_id: IdentityId) -> Node {
        if let Some(node) = self.nodes.get(&identity_id) {
            return node.clone();
        }
        let node = Node::new(identity_id);
        self.nodes.insert(identity_id, node.clone());
        node
    }

    pub fn get_node(&self, identity_id: IdentityId) -> Option<Node> {
        self.nodes.get(&identity_id).map(|n| n.clone())
    }

    pub fn update_sbt_count(&self, identity_id: IdentityId, count: u32) {
        if let Some(mut node) = self.nodes.get_mut(&identity_id) {
            node.sbt_count = count;
            node.updated_at = Utc::now();
        }
    }

    pub fn deactivate_node(&self, identity_id: IdentityId) {
        if let Some(mut node) = self.nodes.get_mut(&identity_id) {
            node.active = false;
            node.updated_at = Utc::now();
        }
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    // ─── Edge operations ──────────────────────────────────────────────────────

    /// Add or update an edge. Auto-creates nodes if missing.
    pub fn upsert_edge(&self, edge: Edge) -> Result<(), GraphError> {
        self.upsert_node(edge.from);
        self.upsert_node(edge.to);

        let ctx_name = edge.context.clone();
        let att_id = edge.attestation_id;
        let from = edge.from;
        let to = edge.to;

        self.edges.insert(att_id, edge);

        // Update context partition
        self.contexts
            .entry(ctx_name.clone())
            .or_insert_with(|| GraphContext::new(&ctx_name))
            .adjacency
            .entry(from)
            .or_default()
            .insert(att_id);

        self.contexts
            .get_mut(&ctx_name)
            .unwrap()
            .reverse_adjacency
            .entry(to)
            .or_default()
            .insert(att_id);

        Ok(())
    }

    pub fn revoke_edge(&self, attestation_id: u64) -> Result<(), GraphError> {
        let mut edge = self
            .edges
            .get_mut(&attestation_id)
            .ok_or(GraphError::EdgeNotFound(0, 0, attestation_id.to_string()))?;
        edge.revoked = true;
        edge.updated_at = Utc::now();
        Ok(())
    }

    pub fn get_edge(&self, attestation_id: u64) -> Option<Edge> {
        self.edges.get(&attestation_id).map(|e| e.clone())
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    /// Get all active (non-revoked) outgoing edges from a node in a context.
    pub fn outgoing_edges(&self, from: IdentityId, context: &str) -> Vec<Edge> {
        let Some(ctx) = self.contexts.get(context) else {
            return vec![];
        };
        let Some(att_ids) = ctx.adjacency.get(&from) else {
            return vec![];
        };
        att_ids
            .iter()
            .filter_map(|id| self.edges.get(id))
            .filter(|e| !e.revoked)
            .map(|e| e.clone())
            .collect()
    }

    /// Get all active (non-revoked) incoming edges to a node in a context.
    pub fn incoming_edges(&self, to: IdentityId, context: &str) -> Vec<Edge> {
        let Some(ctx) = self.contexts.get(context) else {
            return vec![];
        };
        let Some(att_ids) = ctx.reverse_adjacency.get(&to) else {
            return vec![];
        };
        att_ids
            .iter()
            .filter_map(|id| self.edges.get(id))
            .filter(|e| !e.revoked)
            .map(|e| e.clone())
            .collect()
    }

    /// List all nodes in the graph.
    pub fn all_nodes(&self) -> Vec<Node> {
        self.nodes.iter().map(|kv| kv.value().clone()).collect()
    }

    /// List all active nodes in a given context.
    pub fn nodes_in_context(&self, context: &str) -> Vec<IdentityId> {
        let Some(ctx) = self.contexts.get(context) else {
            return vec![];
        };
        ctx.adjacency.keys().copied().collect()
    }

    /// List all contexts.
    pub fn contexts(&self) -> Vec<String> {
        self.contexts.iter().map(|kv| kv.key().clone()).collect()
    }
}

impl Default for Graph {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_upsert_node() {
        let g = Graph::new();
        let node = g.upsert_node(1);
        assert_eq!(node.identity_id, 1);
        assert_eq!(g.node_count(), 1);
    }

    #[test]
    fn test_upsert_edge() {
        let g = Graph::new();
        let edge = Edge::new(1, 1, 2, 80, "defi").unwrap();
        g.upsert_edge(edge).unwrap();
        assert_eq!(g.edge_count(), 1);
        assert_eq!(g.node_count(), 2);
    }

    #[test]
    fn test_self_loop_rejected() {
        let result = Edge::new(1, 1, 1, 50, "defi");
        assert!(result.is_err());
    }

    #[test]
    fn test_outgoing_edges() {
        let g = Graph::new();
        g.upsert_edge(Edge::new(1, 1, 2, 50, "defi").unwrap())
            .unwrap();
        g.upsert_edge(Edge::new(2, 1, 3, 70, "defi").unwrap())
            .unwrap();
        let out = g.outgoing_edges(1, "defi");
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn test_revoke_edge() {
        let g = Graph::new();
        g.upsert_edge(Edge::new(1, 1, 2, 50, "defi").unwrap())
            .unwrap();
        g.revoke_edge(1).unwrap();
        let out = g.outgoing_edges(1, "defi");
        assert!(out.is_empty());
    }

    #[test]
    fn test_time_decay() {
        let mut edge = Edge::new(1, 1, 2, 100, "defi").unwrap();
        // Simulate an old edge by backdating created_at by 365 days
        edge.created_at = Utc::now() - chrono::Duration::days(365);
        let decayed = edge.decayed_weight(180.0);
        // After 365 days with half-life 180: weight * 2^(-365/180) ≈ weight * 0.245
        assert!(decayed < 0.3, "Expected significant decay, got {}", decayed);
        assert!(decayed > 0.0);
    }
}
