terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  registry = "gcr.io/${var.project_id}"
  tag      = var.image_tag
}

# ── Enable required APIs ───────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "storage.googleapis.com",
    "artifactregistry.googleapis.com",
    "containerregistry.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# ── Grant Cloud Build SA permissions (required for Cloud Functions Gen2) ───────
data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloudbuild_builder" {
  project    = var.project_id
  role       = "roles/cloudbuild.builds.builder"
  member     = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
  depends_on = [google_project_service.apis]
}

# IAM changes take up to 60 s to propagate — wait before Cloud Build tries to run.
resource "time_sleep" "iam_propagation" {
  depends_on      = [google_project_iam_member.cloudbuild_builder]
  create_duration = "90s"
}

# ── Equity Service ─────────────────────────────────────────────────────────────
# Cloud Run v2 sets PORT automatically from container_port — do not set it in env.
resource "google_cloud_run_v2_service" "equity" {
  name       = "ql-equity-service"
  location   = var.region
  depends_on = [google_project_service.apis]

  template {
    containers {
      image = "${local.registry}/ql-equity-service:${local.tag}"
      ports { container_port = 8001 }
      resources {
        limits = { cpu = "1", memory = "1Gi" }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }
}

# ── API Gateway ────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "gateway" {
  name       = "ql-api-gateway"
  location   = var.region
  depends_on = [google_project_service.apis]

  template {
    containers {
      image = "${local.registry}/ql-api-gateway:${local.tag}"
      ports { container_port = 8000 }
      env {
        name  = "EQUITY_SERVICE_URL"
        value = google_cloud_run_v2_service.equity.uri
      }
      env {
        name  = "FIXED_INCOME_SERVICE_URL"
        value = google_cloud_run_v2_service.fixed_income.uri
      }
      env {
        name  = "RISK_SERVICE_URL"
        value = google_cloud_run_v2_service.risk.uri
      }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
  }
}

# ── Frontend ───────────────────────────────────────────────────────────────────
# Minimum memory for Cloud Run v2 with always-allocated CPU is 512Mi.
resource "google_cloud_run_v2_service" "frontend" {
  name       = "ql-frontend"
  location   = var.region
  depends_on = [google_project_service.apis]

  template {
    containers {
      image = "${local.registry}/ql-frontend:${local.tag}"
      ports { container_port = 8080 }
      env {
        name  = "GATEWAY_URL"
        value = google_cloud_run_v2_service.gateway.uri
      }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
  }
}

# ── Fixed Income Service ───────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "fixed_income" {
  name       = "ql-fixed-income-service"
  location   = var.region
  depends_on = [google_project_service.apis]

  template {
    containers {
      image = "${local.registry}/ql-fixed-income-service:${local.tag}"
      ports { container_port = 8002 }
      resources {
        limits = { cpu = "1", memory = "1Gi" }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
  }
}

# ── Risk Service ───────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "risk" {
  name       = "ql-risk-service"
  location   = var.region
  depends_on = [google_project_service.apis]

  template {
    containers {
      image = "${local.registry}/ql-risk-service:${local.tag}"
      ports { container_port = 8003 }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }
  }
}

# ── Public IAM (unauthenticated invoke) ───────────────────────────────────────
resource "google_cloud_run_service_iam_member" "frontend_public" {
  service  = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "gateway_public" {
  service  = google_cloud_run_v2_service.gateway.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "equity_public" {
  service  = google_cloud_run_v2_service.equity.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "fixed_income_public" {
  service  = google_cloud_run_v2_service.fixed_income.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "risk_public" {
  service  = google_cloud_run_v2_service.risk.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Cloud Function: Black-Scholes formula ─────────────────────────────────────
resource "google_storage_bucket" "fn_source" {
  name                        = "${var.project_id}-ql-fn-source"
  location                    = var.region
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.apis]
}

resource "google_storage_bucket_object" "black_formula_zip" {
  name   = "black-formula-${local.tag}.zip"
  bucket = google_storage_bucket.fn_source.name
  source = "${path.module}/../../functions/black-formula-src.zip"
}

resource "google_cloudfunctions2_function" "black_formula" {
  name       = "ql-black-formula"
  location   = var.region
  depends_on = [google_project_service.apis, time_sleep.iam_propagation]

  build_config {
    runtime     = "python311"
    entry_point = "black_formula"
    source {
      storage_source {
        bucket = google_storage_bucket.fn_source.name
        object = google_storage_bucket_object.black_formula_zip.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    available_memory   = "256M"
    timeout_seconds    = 60
    ingress_settings   = "ALLOW_ALL"
  }
}

resource "google_cloudfunctions2_function_iam_member" "black_formula_public" {
  location       = var.region
  cloud_function = google_cloudfunctions2_function.black_formula.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}
