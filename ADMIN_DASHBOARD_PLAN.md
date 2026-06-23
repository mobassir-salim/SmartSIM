# ADMIN_DASHBOARD_PLAN.md

# SmartSIM Admin Portal Development Plan

## Overview

The SmartSIM Admin Portal is an internal operations platform used by:

* Super Administrators
* Operations Teams
* Customer Support Agents
* System Administrators

The Admin Portal allows authorized users to manage customers, SIMs, plans, wallets, orders, support tickets, system monitoring, and application logs from a centralized interface.

The portal is designed to simulate a real telecom operations environment.

---

# Objectives

The Admin Portal should enable teams to:

* Manage customer accounts
* Troubleshoot customer issues
* Manage SIM inventory
* Manage recharge plans
* Monitor wallet transactions
* Handle order failures
* Resolve support tickets
* Monitor service health
* View centralized logs
* Audit administrator actions

---

# Technology Stack

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* React Query
* Axios

## Backend

* FastAPI
* JWT Authentication
* RBAC Authorization

## Database

PostgreSQL

## Monitoring

* Prometheus
* Grafana

## Logging

* Elasticsearch
* Logstash
* Kibana

---

# User Roles

## Super Admin

Full access.

Permissions:

* Manage Admin Users
* Manage Roles
* Manage Permissions
* View Audit Logs
* Access All Modules

---

## Operations Admin

Permissions:

* Manage Customers
* Manage SIMs
* Manage Plans
* Manage Orders
* Manage Wallets

Restrictions:

* Cannot manage admin users

---

## Support Agent

Permissions:

* View Customers
* View Wallets
* View Orders
* Manage Tickets

Restrictions:

* Cannot modify system configuration

---

# Admin Portal Modules

---

# Module 1: Dashboard

## Route

/admin/dashboard

## Purpose

Provide operational overview.

## Widgets

### Customer Metrics

* Total Customers
* Active Customers
* Suspended Customers

### Order Metrics

* Orders Today
* Failed Orders
* Revenue Today

### SIM Metrics

* Available SIMs
* Activated SIMs
* Reserved SIMs

### Wallet Metrics

* Wallet Credits
* Wallet Debits
* Failed Transactions

---

# Module 2: Customer Management

## Route

/admin/customers

## Features

### Search Customer

Search By:

* Customer ID
* Name
* Email
* Mobile Number
* MSISDN
* ICCID

### Customer Actions

* View Profile
* Edit Profile
* Update Email
* Update Mobile
* Suspend Customer
* Activate Customer
* Reset Password

---

# Customer Detail Page

## Route

/admin/customers/{customer_id}

### Profile Information

* Name
* Email
* Mobile
* Status
* Registration Date

### Wallet Information

* Current Balance
* Recent Transactions

### Orders

* Active Orders
* Completed Orders

### SIM Information

* SIM Number
* Status
* Active Plan

---

# Module 3: SIM Management

## Route

/admin/sims

## Features

### SIM Inventory

View:

* ICCID
* IMSI
* MSISDN
* Network
* Status

### Actions

* Add SIM
* Update SIM
* Activate SIM
* Deactivate SIM
* Reserve SIM

---

# SIM Database Fields

id

iccid

imsi

msisdn

network

sim_type

status

created_at

---

# Module 4: Plan Management

## Route

/admin/plans

## Features

### Plan Categories

* Data Plans
* Voice Plans
* Combo Plans
* Roaming Plans

### Actions

* Create Plan
* Update Plan
* Disable Plan
* Delete Plan

---

# Plan Fields

id

name

price

validity

data_limit

voice_limit

sms_limit

status

---

# Module 5: Wallet Management

## Route

/admin/wallets

## Features

### Wallet Search

Search By:

* Customer
* Mobile Number
* Wallet ID

### Actions

* Credit Wallet
* Debit Wallet
* Freeze Wallet
* Unfreeze Wallet

---

# Wallet Transaction Page

## Route

/admin/wallet-transactions

### Filters

* Customer
* Date Range
* Transaction Type

### Transaction Types

* Credit
* Debit
* Refund
* Adjustment

---

# Module 6: Order Management

## Route

/admin/orders

## Features

### Order Search

Search By:

* Order ID
* Customer ID
* Mobile Number

### Actions

* View Order
* Cancel Order
* Retry Order
* Refund Order

---

# Order Status

* Created
* Processing
* Completed
* Failed
* Cancelled
* Refunded

---

# Module 7: Support Ticket Management

## Route

/admin/tickets

## Features

### Ticket Types

* SIM Activation Issue
* Recharge Issue
* Wallet Issue
* Order Issue
* Account Issue

### Actions

* Assign Ticket
* Update Status
* Add Comments
* Resolve Ticket

---

# Ticket Status

* Open
* Assigned
* In Progress
* Resolved
* Closed

---

# Module 8: Service Health Monitoring

## Route

/admin/system-health

## Purpose

Display status of all services.

### Services

* Auth Service
* SIM Service
* Plan Service
* Wallet Service
* Order Service
* Notification Service
* PostgreSQL
* Redis
* RabbitMQ

### Health Endpoint

GET /health

### Status Indicators

* UP
* DOWN
* DEGRADED

---

# Module 9: Monitoring Dashboard

## Route

/admin/monitoring

## Integration

Grafana

### Metrics

* API Requests
* Response Time
* Error Rate
* CPU Usage
* Memory Usage
* Active Sessions

---

# Module 10: Centralized Logging

## Route

/admin/logs

## Integration

Kibana

### Purpose

Search logs from all services.

### Search Filters

* Service Name
* User ID
* Order ID
* Customer ID
* Log Level
* Date Range

### Log Levels

* INFO
* WARNING
* ERROR
* CRITICAL

---

# Module 11: Audit Logs

## Route

/admin/audit-logs

## Purpose

Track all administrator actions.

### Audit Log Fields

id

admin_id

action

entity_type

entity_id

old_value

new_value

ip_address

timestamp

---

# Example Audit Events

Customer Updated

Wallet Credited

SIM Activated

Plan Modified

Order Refunded

Ticket Resolved

Admin Created

---

# Module 12: Admin User Management

## Route

/admin/admin-users

## Features

### Admin CRUD

* Create Admin
* Update Admin
* Disable Admin

### Role Assignment

* Super Admin
* Operations Admin
* Support Agent

---

# Database Tables

admin_users

roles

permissions

admin_role_mapping

audit_logs

support_tickets

ticket_comments

---

# Security Requirements

## Authentication

JWT Authentication

## Authorization

Role-Based Access Control (RBAC)

## Additional Security

* Session Timeout
* Password Policy
* Login Rate Limiting
* Audit Logging
* IP Tracking

---

# API Endpoints

## Customers

GET /api/admin/customers

GET /api/admin/customers/{id}

PUT /api/admin/customers/{id}

---

## Wallet

POST /api/admin/wallet/credit

POST /api/admin/wallet/debit

GET /api/admin/wallet/transactions

---

## SIM

GET /api/admin/sims

POST /api/admin/sims

PUT /api/admin/sims/{id}

---

## Plans

GET /api/admin/plans

POST /api/admin/plans

PUT /api/admin/plans/{id}

---

## Orders

GET /api/admin/orders

GET /api/admin/orders/{id}

POST /api/admin/orders/refund

---

## Tickets

GET /api/admin/tickets

POST /api/admin/tickets/assign

POST /api/admin/tickets/resolve

---

# Testing Requirements

## Unit Testing

pytest

## Integration Testing

* Customer Management
* Wallet Operations
* Order Management

## UI Testing

* Admin Login
* Customer Search
* Wallet Credit/Debit
* SIM Activation
* Ticket Resolution

---

# Success Criteria

The Admin Portal is considered complete when:

* Admins can manage customers
* Wallet operations work
* Orders can be monitored
* SIM inventory can be managed
* Tickets can be resolved
* Service health is visible
* Grafana dashboards are accessible
* Kibana logs are searchable
* Audit logs are recorded
* RBAC permissions are enforced
