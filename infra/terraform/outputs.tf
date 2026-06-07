output "frontend_url" {
  description = "Public URL of the frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "gateway_url" {
  description = "Public URL of the API gateway"
  value       = google_cloud_run_v2_service.gateway.uri
}

output "equity_service_url" {
  description = "URL of the equity service"
  value       = google_cloud_run_v2_service.equity.uri
}

output "fixed_income_service_url" {
  description = "URL of the fixed income service"
  value       = google_cloud_run_v2_service.fixed_income.uri
}

output "risk_service_url" {
  description = "URL of the risk service"
  value       = google_cloud_run_v2_service.risk.uri
}

output "black_formula_url" {
  description = "URL of the black-formula Cloud Function"
  value       = google_cloudfunctions2_function.black_formula.service_config[0].uri
}
