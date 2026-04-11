//! Soulbound Reputational Graph Engine
//!
//! Implements a directed weighted graph engine with:
//! - PageRank-style scoring
//! - Time-decay weighting
//! - Sybil-resistance heuristics
//! - Context partitioning

pub mod graph;
pub mod pagerank;
pub mod sybil;
pub mod scoring;
pub mod error;

pub use graph::{Graph, Node, Edge, GraphContext};
pub use pagerank::{PageRankConfig, compute_pagerank};
pub use scoring::{ReputationScore, ScoringEngine, ScoringConfig};
pub use sybil::{SybilDetector, SybilConfig};
pub use error::GraphError;
