#!/usr/bin/env bash
# deploy.sh
# One-shot script to build, push, and deploy ShopVue to AWS ECS.
# Run this once manually to bootstrap — after that CI/CD handles it.
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Docker running
#   - Terraform applied (terraform apply) so ECR repos and ECS cluster exist
#   - jq installed (brew install jq / apt install jq)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

# ── Config — edit these to match your terraform outputs ───────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT="${PROJECT:-shopvue}"
ENVIRONMENT="${ENVIRONMENT:-production}"

ECR_BACKEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENVIRONMENT}-backend"
ECR_FRONTEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENVIRONMENT}-frontend"
ECS_CLUSTER="${PROJECT}-${ENVIRONMENT}"
BACKEND_SERVICE="${PROJECT}-${ENVIRONMENT}-backend"
FRONTEND_SERVICE="${PROJECT}-${ENVIRONMENT}-frontend"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        ShopVue — AWS ECS Deploy Script               ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Region    : ${AWS_REGION}"
echo "║  Account   : ${AWS_ACCOUNT_ID}"
echo "║  Cluster   : ${ECS_CLUSTER}"
echo "║  Image tag : ${IMAGE_TAG}"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: ECR Login ─────────────────────────────────────────────────────────
echo "▶  Logging into ECR…"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ── Step 2: Build & Push Backend ──────────────────────────────────────────────
echo ""
echo "▶  Building backend image…"
docker build -t "${ECR_BACKEND}:${IMAGE_TAG}" -t "${ECR_BACKEND}:latest" ./backend
echo "▶  Pushing backend image…"
docker push "${ECR_BACKEND}:${IMAGE_TAG}"
docker push "${ECR_BACKEND}:latest"
echo "   ✓ Backend pushed → ${ECR_BACKEND}:${IMAGE_TAG}"

# ── Step 3: Build & Push Frontend ─────────────────────────────────────────────
echo ""
echo "▶  Building frontend image…"
docker build -t "${ECR_FRONTEND}:${IMAGE_TAG}" -t "${ECR_FRONTEND}:latest" ./frontend
echo "▶  Pushing frontend image…"
docker push "${ECR_FRONTEND}:${IMAGE_TAG}"
docker push "${ECR_FRONTEND}:latest"
echo "   ✓ Frontend pushed → ${ECR_FRONTEND}:${IMAGE_TAG}"

# ── Step 4: Deploy Backend Service ────────────────────────────────────────────
echo ""
echo "▶  Deploying backend to ECS…"
BACKEND_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "${ECS_CLUSTER}-backend" \
  --query 'taskDefinition' --output json)

NEW_BACKEND_TASK=$(echo "$BACKEND_TASK_DEF" \
  | jq --arg IMAGE "${ECR_BACKEND}:${IMAGE_TAG}" \
    '.containerDefinitions[0].image = $IMAGE
     | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

NEW_BACKEND_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_BACKEND_TASK" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$BACKEND_SERVICE" \
  --task-definition "$NEW_BACKEND_ARN" \
  --force-new-deployment \
  --output json > /dev/null

echo "   ✓ Backend service updated → $(basename $NEW_BACKEND_ARN)"

# ── Step 5: Deploy Frontend Service ───────────────────────────────────────────
echo ""
echo "▶  Deploying frontend to ECS…"
FRONTEND_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "${ECS_CLUSTER}-frontend" \
  --query 'taskDefinition' --output json)

NEW_FRONTEND_TASK=$(echo "$FRONTEND_TASK_DEF" \
  | jq --arg IMAGE "${ECR_FRONTEND}:${IMAGE_TAG}" \
    '.containerDefinitions[0].image = $IMAGE
     | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

NEW_FRONTEND_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_FRONTEND_TASK" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$FRONTEND_SERVICE" \
  --task-definition "$NEW_FRONTEND_ARN" \
  --force-new-deployment \
  --output json > /dev/null

echo "   ✓ Frontend service updated → $(basename $NEW_FRONTEND_ARN)"

# ── Step 6: Wait for stability ────────────────────────────────────────────────
echo ""
echo "▶  Waiting for services to stabilise (this takes ~2 min)…"
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$BACKEND_SERVICE" "$FRONTEND_SERVICE"

# ── Step 7: Print ALB URL ──────────────────────────────────────────────────────
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "${PROJECT}-${ENVIRONMENT}-alb" \
  --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "check AWS console")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Deploy complete!                                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  URL: http://${ALB_DNS}"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
