//! Soulbound Reputational Graph Engine
//!
//! Implements a directed weighted graph engine with:
//! - PageRank-style scoring
//! - Time-decay weighting
//! - Sybil-resistance heuristics
//! - Context partitioning

pub mod error;
pub mod graph;
pub mod pagerank;
pub mod scoring;
pub mod sybil;

pub use error::GraphError;
pub use graph::{Edge, Graph, GraphContext, Node};
pub use pagerank::{compute_pagerank, PageRankConfig};
pub use scoring::{ReputationScore, ScoringConfig, ScoringEngine};
pub use sybil::{SybilConfig, SybilDetector};
