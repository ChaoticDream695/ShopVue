# terraform/modules/rds/main.tf

# ── Security Group ─────────────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-rds-sg"
  description = "Allow PostgreSQL access from ECS backend tasks only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-rds-sg" }
}

# ── Subnet Group ───────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.project}-${var.environment}-db-subnet-group" }
}

# ── Parameter Group ────────────────────────────────────────────────────────────
resource "aws_db_parameter_group" "main" {
  name   = "${var.project}-${var.environment}-pg15"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log queries taking > 1s
  }

  tags = { Name = "${var.project}-${var.environment}-param-group" }
}

# ── RDS Instance ───────────────────────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier = "${var.project}-${var.environment}-postgres"

  engine         = "postgres"
  engine_version = "15.5"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 5 # auto-scaling up to 5x
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  # High availability
  multi_az = true

  # Backups
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  delete_automated_backups  = false

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-${var.environment}-final-snapshot"

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  publicly_accessible = false

  tags = { Name = "${var.project}-${var.environment}-postgres" }
}

# ── Enhanced Monitoring Role ───────────────────────────────────────────────────
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
