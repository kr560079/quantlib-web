# quantlib-web Deployment Guide

## Services

| Service | Port | Image |
|---|---|---|
| Frontend (nginx) | 3000 / 8080 | `ql-frontend` |
| API Gateway | 8000 | `ql-api-gateway` |
| Equity Service | 8001 | `ql-equity-service` |
| Fixed Income Service | 8002 | `ql-fixed-income-service` |
| Risk Service | 8003 | `ql-risk-service` |
| Black-Formula Function | — | Cloud Function (python311) |

---

## Docker (local dev)

```bash
# Build and start all services in dev mode (hot-reload frontend)
docker compose up --build

# Rebuild a single service
docker compose up --build equity-service

# Stop and remove containers (keeps volumes)
docker compose down

# Stop and wipe volumes (resets SQLite/DuckDB data)
docker compose down -v
```

URLs after startup:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- Equity Service: http://localhost:8001
- Fixed Income Service: http://localhost:8002
- Risk Service: http://localhost:8003

---

## GCP (Cloud Run + Terraform)

### Prerequisites

```bash
gcloud auth login
gcloud auth configure-docker
```

Required GCP APIs (enable once per project):
```bash
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com
```

### 1. Build and push images

Replace `PROJECT_ID` and `TAG` (use a git SHA for traceability):

```bash
export PROJECT_ID=your-gcp-project-id
export TAG=$(git rev-parse --short HEAD)   # or "latest"
export REGISTRY=gcr.io/$PROJECT_ID

# Build each image
docker build -t $REGISTRY/ql-equity-service:$TAG        ./services/equity-service
docker build -t $REGISTRY/ql-fixed-income-service:$TAG  ./services/fixed-income-service
docker build -t $REGISTRY/ql-risk-service:$TAG          ./services/risk-service
docker build -t $REGISTRY/ql-api-gateway:$TAG           ./services/api-gateway
docker build -t $REGISTRY/ql-frontend:$TAG              ./frontend

# Push all
docker push $REGISTRY/ql-equity-service:$TAG
docker push $REGISTRY/ql-fixed-income-service:$TAG
docker push $REGISTRY/ql-risk-service:$TAG
docker push $REGISTRY/ql-api-gateway:$TAG
docker push $REGISTRY/ql-frontend:$TAG
```

### 2. Package the Cloud Function

```bash
cd functions/black-formula
zip -r ../../infra/terraform/../../functions/black-formula-src.zip .
cd -
# File must be at: functions/black-formula-src.zip
# (Terraform reads it from path relative to infra/terraform/)
```

Or from the repo root:
```bash
Compress-Archive -Path functions\black-formula\* -DestinationPath functions\black-formula-src.zip -Force
```

### 3. Deploy with Terraform

```bash
cd infra/terraform

terraform init

terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="region=us-central1" \
  -var="image_tag=$TAG"
```

Terraform provisions:
- Cloud Run: `ql-frontend`, `ql-api-gateway`, `ql-equity-service`
- Cloud Function Gen2: `ql-black-formula`
- GCS bucket for function source
- Public IAM for frontend and gateway

After apply, retrieve URLs:
```bash
terraform output
```

### 4. Update the frontend gateway URL (if needed)

If the gateway URL changes after a fresh deploy, rebuild the frontend image with the new URL:

```bash
docker build \
  --build-arg VITE_API_URL=$(terraform output -raw gateway_url) \
  -t $REGISTRY/ql-frontend:$TAG \
  ./frontend

docker push $REGISTRY/ql-frontend:$TAG

terraform apply -var="project_id=$PROJECT_ID" -var="image_tag=$TAG"
```

### 5. Tear down

```bash
terraform destroy \
  -var="project_id=$PROJECT_ID" \
  -var="region=us-central1" \
  -var="image_tag=$TAG"
```

---

## CI (GitHub Actions)

The workflow at `.github/workflows/ci.yml` runs on every push/PR to `main`:
- Lints and tests `equity-service` (Python 3.11)
- Builds the frontend (`npm ci && npm run build`)

To add CD, add a deploy job after build that runs the steps in sections 1–3 above, using GitHub secrets for `PROJECT_ID` and a GCP service account key.


# Redploy after a fix locally
docker compose build --no-cache fixed-income-service && docker compose up -d
