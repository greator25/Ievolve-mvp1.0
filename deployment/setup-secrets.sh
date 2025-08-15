#!/bin/bash

# Setup Google Cloud Secrets
PROJECT_ID="ievolve-event-management"

# Create secrets for production
echo "IevolveSecure2025!" | gcloud secrets create db-password --data-file=-
echo "postgresql://ievolve_user:IevolveSecure2025!@/ievolve_db?host=/cloudsql/$PROJECT_ID:us-central1:ievolve-postgres" | gcloud secrets create database-url --data-file=-

# Twilio secrets (replace with your actual values)
echo "YOUR_TWILIO_ACCOUNT_SID" | gcloud secrets create twilio-account-sid --data-file=-
echo "YOUR_TWILIO_AUTH_TOKEN" | gcloud secrets create twilio-auth-token --data-file=-  
echo "YOUR_TWILIO_PHONE_NUMBER" | gcloud secrets create twilio-phone-number --data-file=-

# Session secret
echo "$(openssl rand -hex 32)" | gcloud secrets create session-secret --data-file=-

echo "Secrets created successfully!"
echo "Don't forget to update Twilio credentials with your actual values:"
echo "gcloud secrets versions add twilio-account-sid --data-file=- <<< 'your_actual_sid'"
echo "gcloud secrets versions add twilio-auth-token --data-file=- <<< 'your_actual_token'"
echo "gcloud secrets versions add twilio-phone-number --data-file=- <<< 'your_actual_number'"