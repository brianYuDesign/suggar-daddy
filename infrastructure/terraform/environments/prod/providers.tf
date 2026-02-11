provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "suggar-daddy"
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}
