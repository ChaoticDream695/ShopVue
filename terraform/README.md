# 🚀 Deploying ShopVue to AWS ECS with Terraform

This guide walks you from zero to a fully running production environment on AWS.

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────┐
│          Application Load Balancer (public)          │
│  / → frontend target group                          │
│  /api/* → backend target group                      │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌────────▼────────────┐
    │   ECS Fargate        │  │   ECS Fargate        │
    │   Frontend Service   │  │   Backend Service    │
    │   (Nginx + Vue SPA)  │  │   (Node / Express)   │
    │   private subnet     │  │   private subnet     │
    └─────────────────────┘  └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │  RDS PostgreSQL 15    │
                              │  Multi-AZ             │
                              │  private subnet       │
                              └──────────────────────┘

Supporting services:
  ECR       — Docker image registry (backend + frontend)
  Secrets   — AWS Secrets Manager (DB password, JWT secret)
  CloudWatch — Logs + Container Insights
  S3         — ALB access logs
  IAM        — Least-privilege roles for ECS tasks
  NAT GW     — Outbound internet for private subnets
```

---

## Prerequisites

Install these tools before starting:

```bash
# Terraform >= 1.6
brew install terraform        # macOS
# or https://developer.hashicorp.com/terraform/install

# AWS CLI v2
brew install awscli
aws configure                 # enter your Access Key, Secret, region

# Docker (for building images)
# https://docs.docker.com/get-docker/

# jq (used by deploy.sh)
brew install jq
```

---

## Step 1 — Bootstrap: Create Terraform State Storage (once only)

Before running Terraform, create an S3 bucket and DynamoDB table for remote state:

```bash
AWS_REGION="eu-west-1"   # change to your preferred region
PROJECT="shopvue"

# S3 bucket for state
aws s3api create-bucket \
  --bucket "${PROJECT}-terraform-state" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

aws s3api put-bucket-versioning \
  --bucket "${PROJECT}-terraform-state" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${PROJECT}-terraform-state" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# DynamoDB table for state locking
aws dynamodb create-table \
  --table-name "${PROJECT}-terraform-locks" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"
```

Then uncomment the `backend "s3"` block in `terraform/main.tf` and fill in your bucket name.

---

## Step 2 — Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` — the fields you **must** change:

| Variable       | What to put                                   |
|----------------|-----------------------------------------------|
| `aws_region`   | Your preferred AWS region                     |
| `db_password`  | Strong password, min 16 chars, no `@` or `/`  |
| `jwt_secret`   | Random string, min 32 chars                   |

Generate a strong JWT secret:
```bash
openssl rand -base64 48
```

---

## Step 3 — Provision Infrastructure

```bash
cd terraform

# Preview what will be created (~35 resources)
terraform init
terraform plan

# Create everything (takes ~15 minutes — RDS Multi-AZ is slow)
terraform apply
```

When complete, note the outputs:
```
alb_dns_name        = "shopvue-production-alb-XXXXXXXX.eu-west-1.elb.amazonaws.com"
ecr_backend_url     = "123456789.dkr.ecr.eu-west-1.amazonaws.com/shopvue-production-backend"
ecr_frontend_url    = "123456789.dkr.ecr.eu-west-1.amazonaws.com/shopvue-production-frontend"
ecs_cluster_name    = "shopvue-production"
```

---

## Step 4 — Build & Deploy the Application (First Time)

Run the deploy script — it builds both Docker images, pushes them to ECR,
and updates the ECS services:

```bash
cd ..   # back to project root
chmod +x deploy.sh
./deploy.sh
```

This takes about 3–5 minutes. When done, visit:
```
http://<alb_dns_name>
```

---

## Step 5 — Run Database Schema Migration (Once)

After the first deploy, apply the schema to RDS:

```bash
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

Optionally seed demo data (runs inside the ECS task via exec):
```bash
AWS_REGION=eu-west-1 PROJECT=shopvue ENVIRONMENT=production \
  aws ecs execute-command \
    --cluster shopvue-production \
    --task $(aws ecs list-tasks --cluster shopvue-production \
              --service-name shopvue-production-backend \
              --query 'taskArns[0]' --output text) \
    --container backend \
    --interactive \
    --command "node src/config/seed.js"
```

---

## Step 6 — Set Up CI/CD with GitHub Actions

The pipeline in `.github/workflows/deploy.yml` automatically:
- Runs tests on every pull request
- Builds + pushes images to ECR on every merge to `main`
- Deploys rolling updates to ECS

**Add these secrets to your GitHub repository**
(Settings → Secrets and variables → Actions):

| Secret                  | Value                                               |
|-------------------------|-----------------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | IAM user access key (see below)                     |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key                                 |
| `AWS_REGION`            | e.g. `eu-west-1`                                    |
| `AWS_ACCOUNT_ID`        | Your 12-digit AWS account ID                        |
| `ECR_BACKEND_REPO`      | `shopvue-production-backend`                        |
| `ECR_FRONTEND_REPO`     | `shopvue-production-frontend`                       |
| `ECS_CLUSTER`           | `shopvue-production`                                |
| `ECS_BACKEND_SERVICE`   | `shopvue-production-backend`                        |
| `ECS_FRONTEND_SERVICE`  | `shopvue-production-frontend`                       |

**Create a least-privilege IAM user for CI/CD:**

```bash
aws iam create-user --user-name shopvue-cicd

aws iam put-user-policy \
  --user-name shopvue-cicd \
  --policy-name shopvue-deploy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListTasks"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": ["iam:PassRole"],
        "Resource": "arn:aws:iam::*:role/shopvue-*"
      }
    ]
  }'

# Create and download access keys
aws iam create-access-key --user-name shopvue-cicd
```

---

## Updating the App After Deploy

Once CI/CD is set up, deployment is automatic — just push to `main`:

```bash
git add .
git commit -m "feat: my change"
git push origin main
# GitHub Actions handles the rest ✅
```

For a manual deploy at any time:
```bash
./deploy.sh
```

---

## Useful Commands

```bash
# View live backend logs
aws logs tail /ecs/shopvue-production/backend --follow

# View live frontend logs
aws logs tail /ecs/shopvue-production/frontend --follow

# SSH into a running container (no bastion needed)
aws ecs execute-command \
  --cluster shopvue-production \
  --task $(aws ecs list-tasks --cluster shopvue-production \
            --service-name shopvue-production-backend \
            --query 'taskArns[0]' --output text) \
  --container backend \
  --interactive \
  --command "/bin/sh"

# Scale backend to 4 replicas
aws ecs update-service \
  --cluster shopvue-production \
  --service shopvue-production-backend \
  --desired-count 4

# Force a new deployment (re-pulls :latest image)
aws ecs update-service \
  --cluster shopvue-production \
  --service shopvue-production-backend \
  --force-new-deployment

# Destroy everything (⚠️ irreversible — deletes RDS!)
cd terraform
terraform destroy
```

---

## Estimated Monthly Cost (eu-west-1)

| Resource                        | Spec            | Est. Cost/mo |
|---------------------------------|-----------------|--------------|
| ECS Fargate — backend (×2)      | 0.25vCPU/512MB  | ~$15         |
| ECS Fargate — frontend (×2)     | 0.25vCPU/512MB  | ~$15         |
| RDS PostgreSQL Multi-AZ         | db.t3.micro     | ~$45         |
| Application Load Balancer       | —               | ~$18         |
| NAT Gateways (×2)               | —               | ~$65         |
| ECR storage                     | <1 GB           | ~$1          |
| CloudWatch Logs                 | minimal         | ~$2          |
| **Total**                       |                 | **~$161/mo** |

> 💡 **To reduce cost during development:** use a single NAT Gateway
> (set `availability_zones` to one AZ), use `db.t3.micro` with Multi-AZ
> disabled, and set `desired_count = 1` for both services.

---

## Security Checklist

- ✅ DB in private subnet — no public access
- ✅ ECS tasks in private subnet — internet via NAT only
- ✅ Secrets stored in AWS Secrets Manager, not env vars
- ✅ RDS encrypted at rest + in transit
- ✅ ALB access logs enabled
- ✅ VPC Flow Logs enabled
- ✅ ECR image scanning on push
- ✅ Least-privilege IAM roles
- ⬜ Add an ACM certificate + HTTPS listener to the ALB
- ⬜ Add AWS WAF to the ALB for production traffic
- ⬜ Enable RDS IAM authentication (replace password auth)
- ⬜ Set up CloudWatch alarms for CPU/memory/error rates
