#!/bin/bash
# 快速部署腳本

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-plan}

echo "=== Suggar Daddy Infrastructure Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo ""

cd "$(dirname "$0")/terraform/environments/$ENVIRONMENT"

case $ACTION in
  init)
    echo "🔧 Initializing Terraform..."
    terraform init
    ;;
  
  plan)
    echo "📋 Planning infrastructure changes..."
    terraform plan
    ;;
  
  apply)
    echo "🚀 Applying infrastructure changes..."
    if [ "$ENVIRONMENT" == "prod" ]; then
      echo "⚠️  WARNING: You are deploying to PRODUCTION!"
      read -p "Are you sure? (yes/no): " confirm
      if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled."
        exit 1
      fi
    fi
    terraform apply
    ;;
  
  destroy)
    echo "💣 Destroying infrastructure..."
    echo "⚠️  WARNING: This will DELETE all resources!"
    read -p "Type 'destroy-$ENVIRONMENT' to confirm: " confirm
    if [ "$confirm" != "destroy-$ENVIRONMENT" ]; then
      echo "Destroy cancelled."
      exit 1
    fi
    terraform destroy
    ;;
  
  output)
    echo "📊 Infrastructure outputs:"
    terraform output
    ;;
  
  ssh-key)
    echo "🔑 Extracting SSH private key..."
    terraform output -raw ssh_private_key > ~/.ssh/suggar-daddy-$ENVIRONMENT.pem
    chmod 600 ~/.ssh/suggar-daddy-$ENVIRONMENT.pem
    echo "✅ SSH key saved to ~/.ssh/suggar-daddy-$ENVIRONMENT.pem"
    ;;
  
  ssh)
    echo "🔐 Connecting to Lightsail instance..."
    LIGHTSAIL_IP=$(terraform output -raw lightsail_ip)
    ssh -i ~/.ssh/suggar-daddy-$ENVIRONMENT.pem ubuntu@$LIGHTSAIL_IP
    ;;
  
  *)
    echo "Usage: $0 <environment> <action>"
    echo ""
    echo "Environments:"
    echo "  dev     - Development environment"
    echo "  prod    - Production environment"
    echo ""
    echo "Actions:"
    echo "  init    - Initialize Terraform"
    echo "  plan    - Show execution plan"
    echo "  apply   - Apply changes"
    echo "  destroy - Destroy all resources"
    echo "  output  - Show outputs"
    echo "  ssh-key - Extract SSH key"
    echo "  ssh     - Connect to instance"
    echo ""
    echo "Examples:"
    echo "  $0 dev init"
    echo "  $0 dev plan"
    echo "  $0 dev apply"
    echo "  $0 prod apply"
    exit 1
    ;;
esac

echo ""
echo "✅ Done!"
