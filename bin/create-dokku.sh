#!/bin/bash

# Prompt for app name
read -p "Enter app name: " APP_NAME

# Prompt for domain
read -p "Enter domain: " DOMAIN

# Prompt for MSAL_CLIENT_ID
read -p "Enter MSAL_CLIENT_ID: " MSAL_CLIENT_ID

# Prompt for MSAL_TENANT_ID
read -p "Enter MSAL_TENANT_ID: " MSAL_TENANT_ID

# Prompt for DOKKU_LETSENCRYPT_EMAIL
read -p "Enter DOKKU_LETSENCRYPT_EMAIL: " LETSENCRYPT_EMAIL

# Prompt for D
read -p "Enter ALLOWED_ORIGINS: " ALLOWED_ORIGINS

# Prompt for AWS backup credentials
read -p "Enter AWS access key ID for backup: " AWS_ACCESS_KEY
read -p "Enter AWS secret access key for backup: " AWS_SECRET_KEY
read -p "Enter S3 bucket name for backup: " S3_BUCKET
read -p "Enter GPG key for backup encryption: " GPG_KEY
read -p "Enter backup schedule cron expression (default: 0 3 * * *): " BACKUP_SCHEDULE
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-"0 3 * * *"}
read -p "Enter backup schedule name: " BACKUP_NAME

# Generate random SESSION_SECRET
SESSION_SECRET=$(openssl rand -base64 32)

# Create app and configure
dokku apps:create $APP_NAME
dokku domains:add $APP_NAME $DOMAIN

# Create and link postgres
dokku postgres:create $APP_NAME
dokku postgres:link $APP_NAME $APP_NAME

# Set environment variables
dokku config:set $APP_NAME MSAL_CLIENT_ID="$MSAL_CLIENT_ID"
dokku config:set $APP_NAME MSAL_TENANT_ID="$MSAL_TENANT_ID"
dokku config:set --no-restart $APP_NAME DOKKU_LETSENCRYPT_EMAIL="$LETSENCRYPT_EMAIL"
dokku config:set $APP_NAME SESSION_SECRET="$SESSION_SECRET"
dokku config:set $APP_NAME ALLOWED_ORIGINS="$ALLOWED_ORIGINS"

# Configure nginx for file uploads
mkdir -p /home/dokku/$APP_NAME/nginx.conf.d/
echo 'client_max_body_size 5m;' > /home/dokku/$APP_NAME/nginx.conf.d/upload.conf
sudo chown -R dokku:dokku /home/dokku/$APP_NAME/nginx.conf.d/
sudo chmod 755 /home/dokku/$APP_NAME/nginx.conf.d/
sudo chmod 644 /home/dokku/$APP_NAME/nginx.conf.d/upload.conf

service nginx reload

# Configure nginx headers
dokku nginx:set $APP_NAME x-forwarded-proto-value '$http_x_forwarded_proto'
dokku nginx:set $APP_NAME x-forwarded-for-value '$http_x_forwarded_for'
dokku nginx:set $APP_NAME x-forwarded-port-value '$http_x_forwarded_port'

# Configure database backups
dokku postgres:backup-auth $APP_NAME "$AWS_ACCESS_KEY" "$AWS_SECRET_KEY" auto s3v4 https://92bdb68939987bdbf6207ccde70891de.eu.r2.cloudflarestorage.com
dokku postgres:backup $APP_NAME "$S3_BUCKET"
dokku postgres:backup-set-encryption $APP_NAME "$GPG_KEY"
dokku postgres:backup-schedule $APP_NAME "$BACKUP_SCHEDULE" "$BACKUP_NAME"

echo "Setup complete for $APP_NAME"