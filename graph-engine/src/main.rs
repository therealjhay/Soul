use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use rgp_graph_engine::{
    graph::Graph,
    scoring::{ScoringConfig, ScoringEngine},
    ReputationScore,
};

#[derive(Parser, Debug)]
#[command(name = "rgp-graph-engine", about = "RGP Graph Engine HTTP API")]
struct Args {
    #[arg(long, env = "LISTEN_ADDR", default_value = "0.0.0.0:8081")]
    listen: String,
}

type SharedGraph = Arc<RwLock<Graph>>;

#[derive(Debug, Serialize)]
struct ApiError {
    error: String,
}

#[derive(Debug, Deserialize)]
struct ContextQuery {
    context: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn get_scores(
    State((graph, engine)): State<(SharedGraph, Arc<ScoringEngine>)>,
    Query(q): Query<ContextQuery>,
) -> Result<Json<Vec<ReputationScore>>, (StatusCode, Json<ApiError>)> {
    let g = graph.read().await;
    let context = q.context.as_deref().unwrap_or("defi");
    engine
        .compute_for_context(&g, context)
        .map(Json)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: e.to_string(),
                }),
            )
        })
}

async fn get_score_by_identity(
    State((graph, engine)): State<(SharedGraph, Arc<ScoringEngine>)>,
    Path(identity_id): Path<u64>,
    Query(q): Query<ContextQuery>,
) -> Result<Json<Option<ReputationScore>>, (StatusCode, Json<ApiError>)> {
    let g = graph.read().await;
    let context = q.context.as_deref().unwrap_or("defi");
    engine
        .compute_for_context(&g, context)
        .map(|scores| Json(scores.into_iter().find(|s| s.identity_id == identity_id)))
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: e.to_string(),
                }),
            )
        })
}

async fn get_graph_stats(
    State((graph, _engine)): State<(SharedGraph, Arc<ScoringEngine>)>,
) -> Json<serde_json::Value> {
    let g = graph.read().await;
    Json(serde_json::json!({
        "node_count": g.node_count(),
        "edge_count": g.edge_count(),
        "contexts": g.contexts(),
    }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let args = Args::parse();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let graph: SharedGraph = Arc::new(RwLock::new(Graph::new()));
    let engine = Arc::new(ScoringEngine::new(ScoringConfig::default()));

    let state = (graph.clone(), engine.clone());

    let app = Router::new()
        .route("/health", get(health))
        .route("/scores", get(get_scores))
        .route("/scores/:identity_id", get(get_score_by_identity))
        .route("/stats", get(get_graph_stats))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&args.listen).await?;
    tracing::info!("Graph engine listening on {}", args.listen);
    axum::serve(listener, app).await?;
    Ok(())
}
