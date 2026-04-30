use thiserror::Error;

#[derive(Debug, Error)]
pub enum GraphError {
    #[error("Node not found: {0}")]
    NodeNotFound(u64),

    #[error("Edge not found: from={0} to={1} context={2}")]
    EdgeNotFound(u64, u64, String),

    #[error("Self-loop not allowed: node={0}")]
    SelfLoop(u64),

    #[error("Invalid weight {0}: must be in [{1}, {2}]")]
    InvalidWeight(f64, f64, f64),

    #[error("Context not found: {0}")]
    ContextNotFound(String),

    #[error("PageRank did not converge after {0} iterations")]
    ConvergenceFailure(usize),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Internal error: {0}")]
    Internal(String),
}
