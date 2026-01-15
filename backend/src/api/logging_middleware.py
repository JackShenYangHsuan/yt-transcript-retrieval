"""Structured logging middleware for the API."""

from __future__ import annotations

import json
import logging
import time
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
)
logger = logging.getLogger("podcast_search")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured request/response logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000

        # Log request details
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": round(latency_ms, 2),
            "client_ip": request.client.host if request.client else None,
        }

        # Log as JSON for easy parsing
        logger.info(json.dumps(log_entry))

        return response


class SearchMetricsLogger:
    """Logger for search-specific metrics."""

    def __init__(self):
        self.logger = logging.getLogger("search_metrics")

    def log_search(
        self,
        query: str,
        filters: dict,
        num_dense_results: int,
        num_bm25_results: int,
        num_fused_results: int,
        num_final_results: int,
        latency_breakdown: dict,
        top_result_score: float | None = None,
    ):
        """Log detailed search metrics."""
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "type": "search",
            "query": query,
            "filters_applied": filters,
            "results": {
                "dense": num_dense_results,
                "bm25": num_bm25_results,
                "fused": num_fused_results,
                "final": num_final_results,
            },
            "latency_ms": latency_breakdown,
            "top_result_score": top_result_score,
        }

        self.logger.info(json.dumps(log_entry))

    def log_zero_results(self, query: str, filters: dict):
        """Log zero-result queries for analysis."""
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "type": "zero_results",
            "query": query,
            "filters_applied": filters,
        }

        self.logger.warning(json.dumps(log_entry))


# Global metrics logger instance
search_metrics = SearchMetricsLogger()
