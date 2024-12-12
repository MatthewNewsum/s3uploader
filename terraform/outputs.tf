# outputs.tf
output "amplify_app_id" {
  value = aws_amplify_app.main.id
}

output "amplify_app_url" {
  value = "https://app.${var.domain_name}"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "cognito_identity_pool_id" {
  value = aws_cognito_identity_pool.main.id
}