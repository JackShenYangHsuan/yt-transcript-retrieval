# Render Deployment: Memory Limits, LFS Bandwidth, and Qdrant Cloud

---
title: "Render Deployment Issues: Memory, LFS, and Qdrant Cloud"
category: deployment-issues
tags: [render, docker, memory, git-lfs, qdrant, production]
symptoms:
  - "Ran out of memory (used over 2GB)"
  - "This repository exceeded its LFS budget"
  - "Failed to fetch" in frontend
  - "collection_info: null" in health check
components: [backend, docker, render, qdrant]
root_cause: multiple
date_resolved: 2026-01-16
---

## Problem Summary

Production deployment to Render failed with multiple cascading issues:
1. Memory exceeded 2GB limit
2. Git LFS bandwidth quota exhausted
3. Qdrant Cloud connection not working (ongoing)

## Issue 1: Docker Path Mismatch

### Symptom
```
WARNING: BM25 index not found at /data/bm25_index
```

### Root Cause
`config.py` calculated `project_root` by going 3 parent directories up from the config file:
```python
@property
def project_root(self) -> Path:
    return Path(__file__).parent.parent.parent
```

This works locally but breaks in Docker where the directory structure is different (`/app/` vs project structure).

### Solution
Added `DATA_DIR_OVERRIDE` environment variable:

```python
# config.py
data_dir_override: Optional[str] = None

@property
def data_dir(self) -> Path:
    if self.data_dir_override:
        return Path(self.data_dir_override)
    return self.project_root / "data"
```

```yaml
# render.yaml
envVars:
  - key: DATA_DIR_OVERRIDE
    value: /app/data
```

### Lesson
**Always use explicit path configuration for Docker deployments** - relative path calculations that work locally often break in containers.

---

## Issue 2: Memory Exceeded 2GB (Qdrant Local)

### Symptom
```
Ran out of memory (used over 2GB) while running your code.
```

### Investigation
Memory profiling revealed:
| Component | Memory |
|-----------|--------|
| Qdrant local storage | 2,495 MB |
| BM25 full mode | ~70 MB |
| Python/FastAPI | ~100 MB |
| **Total** | ~2,665 MB |

### Root Cause
Qdrant local file-based storage loads the entire vector index into memory. With 27,169 vectors at 1536 dimensions, this uses ~2.5GB.

### Solution
**Migrated to Qdrant Cloud** - vectors stored remotely, only client connection in memory:

```python
# qdrant_store.py
if url and api_key:
    # Use Qdrant Cloud
    self.client = QdrantClient(url=url, api_key=api_key)
elif path:
    # Use local file-based storage
    self.client = QdrantClient(path=str(path))
```

```yaml
# render.yaml
- key: QDRANT_URL
  value: https://xxx.us-west-1-0.aws.cloud.qdrant.io
- key: QDRANT_API_KEY
  sync: false  # Set manually in Render dashboard
```

**Result**: Memory reduced from ~2,565 MB to ~122 MB

### Lesson
**Vector databases are memory-intensive** - for production with limited memory, use managed cloud services (Qdrant Cloud, Pinecone, etc.) instead of local storage.

---

## Issue 3: Memory Exceeded 2GB (Reranker Model)

### Symptom
Even with Qdrant Cloud, memory still exceeded 2GB.

### Root Cause
BGE Reranker Large model (`BAAI/bge-reranker-large`) uses ~1.2GB memory.

### Solution
Switch to smaller reranker model:

```yaml
# render.yaml
- key: RERANKER_MODEL
  value: "BAAI/bge-reranker-base"  # ~400MB vs 1.2GB
```

| Model | Memory |
|-------|--------|
| bge-reranker-large | ~1.2 GB |
| bge-reranker-base | ~400 MB |

### Lesson
**Model size directly impacts memory** - choose appropriately sized models for your deployment constraints. The accuracy difference between large/base is often minimal for most use cases.

---

## Issue 4: Git LFS Bandwidth Exceeded

### Symptom
```
Error downloading object: data/bm25_index/bm25_index/data.csc.index.npy
Smudge error: This repository exceeded its LFS budget.
```

### Root Cause
Git LFS has monthly bandwidth limits. Each Render deploy:
1. Clones the repo
2. Downloads ALL LFS files
3. Consumes bandwidth quota

LFS files totaling ~520MB were downloaded on every deploy attempt:
- `storage.sqlite` (Qdrant local): 449 MB
- `chunks.json` (BM25 full mode): 55 MB
- BM25 `.npy` files: ~12 MB

### Solution

**Step 1: Remove unnecessary files**
```bash
# Remove Qdrant local storage (using cloud now)
rm -rf data/qdrant

# Remove chunks.json (using lightweight BM25 mode)
rm data/bm25_index/chunks.json
```

**Step 2: Migrate remaining files from LFS to regular git**
```bash
# Untrack from LFS
git lfs untrack "*.npy"
git lfs untrack "*.sqlite"

# Remove from git cache and re-add as regular files
git rm --cached data/bm25_index/bm25_index/*.npy
git add data/bm25_index/bm25_index/*.npy
```

**Step 3: Update Dockerfile to remove LFS**
```dockerfile
# Before
RUN apt-get install -y git-lfs && git lfs install
RUN git clone ... && git lfs pull

# After
RUN git clone ...  # No LFS needed
```

### Result
LFS usage: 520 MB → 0 MB (files now in regular git)

### Lesson
**Git LFS bandwidth is per-deploy** - for CI/CD pipelines that frequently clone:
1. Keep LFS files small (<50MB total)
2. Or host large files externally (S3, etc.)
3. Or include files directly in git if under 100MB

---

## Issue 5: BM25 Lightweight Mode

### Context
To reduce memory further, implemented BM25 lightweight mode.

### How It Works

**Full mode**: Loads all chunk metadata into memory (~55MB)
```python
# Loads chunks.json with full metadata
self.chunks = [Chunk(**data) for data in chunks_data]
```

**Lightweight mode**: Only loads chunk IDs (~1MB)
```python
# Loads only chunk_ids.json
self.chunk_ids = json.load(f)
# Metadata fetched from Qdrant on-demand
```

### Trade-offs
| Mode | Memory | Filtering |
|------|--------|-----------|
| Full | ~55 MB | BM25-level filtering |
| Lightweight | ~1 MB | Filtering via Qdrant |

### Lesson
**Memory vs. functionality trade-offs** - lightweight modes can significantly reduce memory but may require architectural changes (filtering moved to vector store).

---

## Issue 6: Qdrant Cloud Connection (Ongoing)

### Symptom
```json
{"status":"healthy","collection_info":null}
```
Search returns "No results found" but Idea Constellation works.

### Investigation
- Qdrant Cloud is reachable (curl test works)
- API key is set in Render
- Collection has 27,169 vectors

### Debug Approach
Added debug endpoint to check configuration:
```python
@app.get("/debug/config")
async def debug_config():
    return {
        "qdrant_url_set": bool(settings.qdrant_url),
        "qdrant_api_key_set": bool(settings.qdrant_api_key),
        "qdrant_url_preview": settings.qdrant_url[:50] + "...",
        ...
    }
```

### Potential Causes
1. Environment variables not being read correctly
2. Qdrant client initialization failing silently
3. Persistent disk caching old configuration

### Lesson
**Add debug endpoints for production troubleshooting** - when you can't SSH into production, debug endpoints are invaluable.

---

## Prevention Strategies

### 1. Memory Budget Planning
Before deploying ML models:
```
Budget = Platform Limit - OS Overhead - Safety Margin
       = 2048 MB - 200 MB - 200 MB
       = 1648 MB available
```

### 2. LFS Audit Before CI/CD
```bash
# Check LFS file sizes
git lfs ls-files --size

# Calculate total LFS bandwidth per deploy
git lfs ls-files --size | awk '{sum += $NF} END {print sum " bytes per deploy"}'
```

### 3. Environment Variable Validation
```python
@app.on_event("startup")
async def validate_config():
    required = ["OPENAI_API_KEY", "QDRANT_URL", "QDRANT_API_KEY"]
    missing = [k for k in required if not getattr(settings, k.lower())]
    if missing:
        raise ValueError(f"Missing required config: {missing}")
```

### 4. Health Check with Details
```python
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "checks": {
            "qdrant": check_qdrant_connection(),
            "bm25": check_bm25_loaded(),
            "openai": check_openai_api(),
        }
    }
```

---

## Quick Reference

### Render Memory Limits
| Plan | Memory |
|------|--------|
| Free | 512 MB |
| Starter | 512 MB |
| Standard | 2 GB |
| Pro | 4 GB |

### Component Memory Usage (This App)
| Component | Memory |
|-----------|--------|
| Qdrant Local | ~2.5 GB (too big!) |
| Qdrant Cloud Client | ~50 MB |
| BM25 Full | ~55 MB |
| BM25 Lightweight | ~1 MB |
| Reranker Large | ~1.2 GB |
| Reranker Base | ~400 MB |
| FastAPI/Python | ~100 MB |

### Final Configuration (Working)
```yaml
# render.yaml
- QDRANT_URL: https://xxx.cloud.qdrant.io  # Cloud, not local
- BM25_LIGHTWEIGHT_MODE: "true"             # Reduced memory
- RERANKER_MODEL: "BAAI/bge-reranker-base" # Smaller model
- USE_RERANKER: "true"                      # Still enabled
```

---

## Related Issues
- GitHub LFS bandwidth: https://docs.github.com/en/billing/managing-billing-for-git-large-file-storage
- Qdrant Cloud: https://cloud.qdrant.io/
- Render memory limits: https://render.com/docs/native-environments#memory
