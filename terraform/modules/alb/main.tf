# terraform/modules/alb/main.tf

# ── Security Group ─────────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-alb-sg"
  description = "Allow HTTP/HTTPS from internet"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-alb-sg" }
}

# ── Application Load Balancer ──────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${var.project}-${var.environment}-alb" }
}

# ── S3 Bucket for ALB Access Logs ─────────────────────────────────────────────
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${var.project}-${var.environment}-alb-logs-${random_id.suffix.hex}"
  force_destroy = true
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    expiration { days = 30 }
  }
}

# ── Target Groups ──────────────────────────────────────────────────────────────
resource "aws_lb_target_group" "frontend" {
  name        = "${var.project}-${var.environment}-frontend-tg"
  port        = var.frontend_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${var.project}-frontend-tg" }
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.project}-${var.environment}-backend-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${var.project}-backend-tg" }
}

# ── HTTP Listener — path-based routing ────────────────────────────────────────
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default → frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Route /api/* to backend
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# NOTE: For HTTPS (recommended for production), add:
# 1. An ACM certificate
# 2. An aws_lb_listener on port 443 with the certificate
# 3. A redirect rule on port 80 → 443
