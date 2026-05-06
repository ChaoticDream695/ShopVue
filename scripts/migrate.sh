#!/usr/bin/env bash
# scripts/migrate.sh
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT:-shopvue}"
ENVIRONMENT="${ENVIRONMENT:-production}"
ECS_CLUSTER="${PROJECT}-${ENVIRONMENT}"
BACKEND_SERVICE="${PROJECT}-${ENVIRONMENT}-backend"

echo "▶  Finding a running backend task…"
TASK_ARN=$(aws ecs list-tasks \
  --cluster "$ECS_CLUSTER" \
  --service-name "$BACKEND_SERVICE" \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text)

if [[ "$TASK_ARN" == "None" || -z "$TASK_ARN" ]]; then
  echo "❌  No running backend tasks found!"
  exit 1
fi

echo "   Task: $TASK_ARN"
echo ""
echo "▶  Running schema migration via ECS Exec…"

aws ecs execute-command \
  --cluster "$ECS_CLUSTER" \
  --task "$TASK_ARN" \
  --container backend \
  --interactive \
  --command "node -e \"
    process.env.DB_SSL = 'true';
    const { Pool } = require('pg');
    const fs = require('fs');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    const sql = fs.readFileSync('/app/src/config/schema.sql', 'utf8');
    pool.query(sql)
      .then(() => { console.log('✅ Schema applied successfully'); pool.end(); process.exit(0); })
      .catch(e => { console.error('❌ Migration failed:', e.message); pool.end(); process.exit(1); });
  \""

echo ""
echo "✅  Migration complete!"
