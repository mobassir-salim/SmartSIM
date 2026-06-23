# SmartSIM Production-Like MVP Development Plan

# Project Overview

SmartSIM is a telecom SIM marketplace and customer self-care platform designed to simulate a real-world telecom application architecture.

The objective is not only to build business functionality but also to learn:

* Service-to-service communication
* Linux server deployment
* Docker container orchestration
* API integrations
* Monitoring and logging
* Health checks
* Failure scenarios
* Integration testing
* CI/CD readiness

---

# Technology Stack

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* Axios
* React Router
* React Query

## Backend Services

* FastAPI
* SQLAlchemy
* Alembic
* Pydantic
* JWT Authentication

## Database

* PostgreSQL

## Infrastructure

* Docker
* Docker Compose
* NGINX Reverse Proxy

## Monitoring

* Prometheus
* Grafana

## Logging

* Elasticsearch
* Logstash
* Kibana (ELK Stack)

## Messaging

* RabbitMQ

## Cache

* Redis

## Testing

* Pytest
* Postman
* Newman

---

# System Architecture

Internet
↓
NGINX Reverse Proxy
↓
API Gateway Layer
↓
-

| Auth Service |
| SIM Service |
| Plan Service |
| Wallet Service |
| Order Service |
| Notification Service |
------------------------

↓
PostgreSQL

Additional Infrastructure:

* Redis
* RabbitMQ
* Prometheus
* Grafana

## Logging Stack

* Elasticsearch
* Logstash
* Kibana
---

# Project Structure

SmartSIM/

frontend/

gateway/

services/

auth-service/

sim-service/

plan-service/

wallet-service/

order-service/

notification-service/

database/

postgres/

monitoring/

prometheus/

grafana/

logging/

elasticsearch/

logstash/

kibana/

messaging/

rabbitmq/

cache/

redis/

tests/

unit/

integration/

api/

docker-compose.yml

README.md

---

# Phase 1: Infrastructure Setup

## Goals

Create production-like local environment.

## Tasks

* Create Git repository
* Create Docker network
* Configure PostgreSQL
* Configure Redis
* Configure RabbitMQ
* Configure NGINX
* Configure Docker Compose
* Configure environment variables

## Deliverables

Running infrastructure stack.

## Success Criteria

docker compose up -d starts:

* PostgreSQL
* Redis
* RabbitMQ
* NGINX

All services reachable.

---

# Phase 2: Authentication Service

## Service Port

8001

## Features

* User Registration
* Login
* JWT Access Token
* JWT Refresh Token
* User Profile
* Role Management

## Database Tables

users

roles

permissions

## APIs

POST /api/auth/register

POST /api/auth/login

POST /api/auth/refresh

GET /api/auth/profile

GET /health

## Success Criteria

* User authentication works
* JWT validation works
* Health endpoint returns UP

---

# Phase 3: SIM Service

## Service Port

8002

## Features

* SIM Inventory
* SIM Search
* SIM Availability
* SIM Status

## Database Tables

sims

sim_inventory

## APIs

GET /api/sims

GET /api/sims/{id}

POST /api/sims

PUT /api/sims/{id}

DELETE /api/sims/{id}

GET /health

## Success Criteria

* SIM catalog accessible
* Search and filters working

---

# Phase 4: Plan Service

## Service Port

8003

## Features

* Recharge Plans
* Combo Plans
* Roaming Plans
* Promotions

## Database Tables

plans

offers

## APIs

GET /api/plans

GET /api/plans/{id}

POST /api/plans

PUT /api/plans/{id}

DELETE /api/plans/{id}

GET /health

## Success Criteria

* Plans displayed correctly
* CRUD operations working

---

# Phase 5: Wallet Service

## Service Port

8004

## Features

* Wallet Creation
* Credit Wallet
* Debit Wallet
* Wallet Transactions

## Database Tables

wallets

wallet_transactions

## APIs

GET /api/wallet

POST /api/wallet/add-money

POST /api/wallet/debit

GET /api/wallet/transactions

GET /health

## Success Criteria

* Wallet balance maintained correctly
* Transaction history available

---

# Phase 6: Order Service

## Service Port

8005

## Features

* Cart Management
* Checkout
* Order Placement
* Order Tracking

## Dependencies

* Auth Service
* SIM Service
* Plan Service
* Wallet Service

## Order Flow

Customer Adds Product

↓

Create Order

↓

Verify Inventory

↓

Verify Wallet

↓

Deduct Wallet

↓

Complete Order

## Database Tables

orders

order_items

## APIs

POST /api/orders

GET /api/orders

GET /api/orders/{id}

GET /health

## Success Criteria

* Orders created successfully
* Wallet deducted successfully
* Service integration working

---

# Phase 7: Notification Service

## Service Port

8006

## Features

* Email Notifications
* SMS Notifications
* Event Consumption

## RabbitMQ Events

UserRegistered

OrderCreated

OrderCompleted

WalletCredited

## APIs

POST /api/notifications/send

GET /health

## Success Criteria

* RabbitMQ messages consumed
* Notifications generated

---

# Phase 8: Frontend Development

## Public Pages

* Home
* Login
* Register
* SIM Catalog
* Plan Catalog

## Customer Pages

* Dashboard
* Wallet
* Cart
* Orders
* Profile

## Admin Pages

* Dashboard
* SIM Management
* Plan Management
* User Management
* Orders Management

## Success Criteria

* Complete API integration
* JWT authentication
* Responsive UI

---

# Phase 9: Service Failure Simulation

## Goals

Understand real-world outages.

### Scenario 1

Stop Wallet Service

Expected Result:

* Login Works
* Browse Plans Works
* Checkout Fails

### Scenario 2

Stop SIM Service

Expected Result:

* Login Works
* SIM Page Fails
* Wallet Works

### Scenario 3

Stop RabbitMQ

Expected Result:

* Orders Work
* Notifications Fail

### Scenario 4

Stop PostgreSQL

Expected Result:

* Entire Platform Fails

---

# Phase 10: Monitoring & Observability

## Prometheus

Monitor:

* API Requests
* Error Rate
* Response Time

## Grafana

Dashboards:

* Login Activity
* Orders
* Wallet Transactions
* Service Health

## Health Checks

Every service exposes:

GET /health

GET /metrics

# New Phase 10A: Centralized Logging & Kibana

## Goals

Implement centralized log aggregation and analysis similar to enterprise production systems.

## Components

### Elasticsearch

Responsibilities:

* Store logs
* Index logs
* Support search queries

Container:

elasticsearch

Port:

9200

### Logstash

Responsibilities:

* Collect logs from all services
* Parse log data
* Forward logs to Elasticsearch

Container:

logstash

Port:

5044

### Kibana

Responsibilities:

* Search logs
* Visualize logs
* Investigate incidents
* Create operational dashboards

Container:

kibana

Port:

5601

---

# Logging Standards

All services must generate structured JSON logs.

Example:

{
"timestamp":"2026-06-20T12:00:00Z",
"service":"order-service",
"level":"INFO",
"event":"order_created",
"order_id":"ORD12345",
"user_id":"USR1001"
}

---

# Required Log Levels

## INFO

* User Login
* Wallet Credit
* Order Creation
* SIM Purchase

## WARNING

* Invalid Request
* Expired Token
* Missing Resource

## ERROR

* Database Error
* API Failure
* Wallet Deduction Failure

## CRITICAL

* PostgreSQL Down
* RabbitMQ Down
* Service Startup Failure

---

# Service Logging Requirements

## Auth Service

Log:

* Registration
* Login Success
* Login Failure
* JWT Validation

## SIM Service

Log:

* SIM Search
* SIM Purchase
* Inventory Updates

## Plan Service

Log:

* Plan Queries
* Plan Updates

## Wallet Service

Log:

* Wallet Credit
* Wallet Debit
* Transaction Failure

## Order Service

Log:

* Cart Updates
* Order Creation
* Checkout Failure

## Notification Service

Log:

* Message Published
* Message Consumed
* Notification Failure

---

# Kibana Dashboards

## Service Health Dashboard

Shows:

* Errors by Service
* Error Trends
* Exception Count

## Authentication Dashboard

Shows:

* Login Success Rate
* Failed Logins
* JWT Errors

## Order Dashboard

Shows:

* Orders Created
* Failed Orders
* Checkout Errors

## Wallet Dashboard

Shows:

* Credits
* Debits
* Failed Transactions

# Failure Simulation Scenarios

## Wallet Service Stopped

Expected Behavior

* Login Works
* SIM Catalog Works
* Plan Catalog Works
* Checkout Fails

Expected Kibana Logs

wallet-service unavailable

wallet verification failed

checkout aborted

---

## PostgreSQL Stopped

Expected Behavior

* Multiple Services Fail

Expected Kibana Logs

database connection refused

service unavailable

---

## RabbitMQ Stopped

Expected Behavior

* Orders Work
* Notifications Fail

Expected Kibana Logs

message publish failed

rabbitmq connection refused

---

# Docker Containers Added

Infrastructure Containers

* postgres
* redis
* rabbitmq
* nginx

Monitoring Containers

* prometheus
* grafana

Logging Containers

* elasticsearch
* logstash
* kibana
---
---

# Phase 11: Testing

## Unit Tests

pytest

## API Testing

Postman

Newman

## Integration Testing

Service-to-service communication

## Test Cases

* Login
* Wallet Credit
* Wallet Debit
* Order Creation
* Service Failure Recovery

---

# Phase 12: Linux Deployment

## Target Environment

Ubuntu Server 24.04

## Installed Components

* Docker
* Docker Compose
* NGINX
* Git

## Deployment Flow

Git Pull

↓

Docker Build

↓

Docker Compose Up

↓

Health Validation

## Success Criteria

* Accessible from public IP
* SSL enabled
* Auto restart policies configured

---

# Phase 13: CI/CD Preparation

## GitHub

Source Control

## Jenkins

Future Integration

Pipeline:

Git Push

↓

Run Tests

↓

Build Docker Images

↓

Deploy Containers

---

# Estimated Timeline

Infrastructure Setup - 3 Days

Auth Service - 3 Days

SIM Service - 2 Days

Plan Service - 2 Days

Wallet Service - 3 Days

Order Service - 4 Days

Notification Service - 2 Days

Frontend Development - 6 Days

Monitoring - 2 Days

Testing - 2 Days

Linux Deployment - 2 Days

Total Estimated Time: 4–6 Weeks

---

# Learning Outcomes

After completion you will have hands-on experience with:

* FastAPI
* PostgreSQL
* Docker
* Docker Compose
* Linux Administration
* Reverse Proxy (NGINX)
* RabbitMQ
* Redis
* JWT Authentication
* API Gateway Concepts
* Microservice Communication
* Monitoring with Prometheus
* Grafana Dashboards
* Health Checks
* Service Failure Analysis
* Integration Testing
* Production Deployment
