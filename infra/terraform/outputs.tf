output "frontend_url" {
  description = "Public URL of the frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "gateway_url" {
  description = "Public URL of the API gateway"
  value       = google_cloud_run_v2_service.gateway.uri
}

output "equity_service_url" {
  description = "Internal URL of the equity service"
  value       = google_cloud_run_v2_service.equity.uri
}

output "black_formula_url" {
  description = "URL of the black-formula Cloud Function"
  value       = google_cloudfunctions2_function.black_formula.service_config[0].uri
}
