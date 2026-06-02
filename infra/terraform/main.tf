terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
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

# ── Equity Service ─────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "equity" {
  name     = "ql-equity-service"
  location = var.region

  template {
    containers {
      image = "${local.registry}/ql-equity-service:${local.tag}"
      ports { container_port = 8001 }
      env { name = "PORT"; value = "8001" }
      resources {
        limits = { cpu = "1", memory = "1Gi" }
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

# ── API Gateway ────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "gateway" {
  name     = "ql-api-gateway"
  location = var.region

  template {
    containers {
      image = "${local.registry}/ql-api-gateway:${local.tag}"
      ports { container_port = 8000 }
      env { name = "PORT";                   value = "8000" }
      env { name = "EQUITY_SERVICE_URL";     value = google_cloud_run_v2_service.equity.uri }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }
}

# ── Frontend ───────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "ql-frontend"
  location = var.region

  template {
    containers {
      image = "${local.registry}/ql-frontend:${local.tag}"
      ports { container_port = 8080 }
      resources {
        limits = { cpu = "1", memory = "256Mi" }
      }
    }
    scaling {
      min_instance_count = 0
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

# ── Cloud Function: Black-Scholes formula ─────────────────────────────────────
resource "google_storage_bucket" "fn_source" {
  name     = "${var.project_id}-ql-fn-source"
  location = var.region
}

resource "google_storage_bucket_object" "black_formula_zip" {
  name   = "black-formula-${local.tag}.zip"
  bucket = google_storage_bucket.fn_source.name
  source = "${path.module}/../../functions/black-formula-src.zip"
}

resource "google_cloudfunctions2_function" "black_formula" {
  name     = "ql-black-formula"
  location = var.region

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
    max_instance_count  = 10
    available_memory    = "256M"
    timeout_seconds     = 60
    ingress_settings    = "ALLOW_ALL"
  }
}

resource "google_cloudfunctions2_function_iam_member" "black_formula_public" {
  location       = var.region
  cloud_function = google_cloudfunctions2_function.black_formula.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}
