# SMARTSIM OPERATIONS PORTAL EXPANSION PLAN

## Objective

Extend the current SmartSIM platform with telecom-grade operational modules that support:

* SIM Inventory Management
* Customer Relationship Management (CRM)
* Order Management & Retry System
* Order Journey Tracking
* Failure Analysis

The new modules will integrate with:

* Auth Service
* SIM Service
* Plan Service
* Wallet Service
* Order Service
* Notification Service

without changing the existing architecture.

---

# MODULE 1: SIM INVENTORY MANAGEMENT SYSTEM

## Purpose

Manage physical and virtual SIM inventory.

This module acts as the source of truth for:

* ICCID
* IMSI
* MSISDN
* SIM Status

---

# Business Flow

SIM Uploaded

↓

Stored In Inventory

↓

Customer Places Order

↓

System Reserves SIM

↓

Assign ICCID

↓

Assign IMSI

↓

Generate MSISDN

↓

Activate SIM

↓

Inventory Updated

---

# New Admin Page

Route:

/admin/sim-inventory

---

# Features

## Upload SIM Inventory

Bulk Upload

CSV Format

ICCID,IMSI,SIM_TYPE,CIRCLE

Example:

899100000000001,404450001001001,PREPAID,DELHI

899100000000002,404450001001002,PREPAID,DELHI

---

## SIM Search

Search By

* ICCID
* IMSI
* MSISDN
* Status

---

## Inventory Dashboard

Show

Available SIMs

Reserved SIMs

Activated SIMs

Blocked SIMs

Lost SIMs

---

# Database Tables

## sim_inventory

id

iccid

imsi

sim_type

circle

status

uploaded_at

---

Status Values

AVAILABLE

RESERVED

ACTIVATED

BLOCKED

LOST

---

## sim_assignment

id

inventory_id

customer_id

order_id

msisdn

assigned_at

---

# SIM Allocation Logic

When customer places order:

Step 1

Find:

status='AVAILABLE'

Step 2

Lock Record

Step 3

Assign Customer

Step 4

Generate MSISDN

Step 5

Update Inventory

status='RESERVED'

Step 6

Activate SIM

status='ACTIVATED'

---

# APIs

GET /api/admin/inventory

POST /api/admin/inventory/upload

GET /api/admin/inventory/search

POST /api/admin/inventory/assign

---

# MODULE 2: CUSTOMER CRM SYSTEM

## Purpose

Provide complete customer lifecycle management.

Support agents should be able to view everything related to a customer.

---

# New Admin Page

Route:

/admin/crm

---

# Customer Search

Search By

MSISDN

ICCID

IMSI

Order ID

Email

Customer Name

---

# CRM Customer Profile

Sections

---

## Basic Information

Customer ID

Name

Email

Mobile

Status

Registration Date

---

## SIM Information

MSISDN

ICCID

IMSI

SIM Status

Activation Date

---

## Plan Information

Current Plan

Plan Expiry

Plan History

---

## Wallet Information

Balance

Credits

Debits

---

## Order Information

Order History

Failed Orders

Retry History

---

## Support Information

Open Tickets

Resolved Tickets

---

# Database Tables

customer_profile

customer_plan_history

customer_activity

---

# APIs

GET /api/admin/crm/customer/{id}

GET /api/admin/crm/search

PUT /api/admin/crm/customer

---

# MODULE 3: ORDER MANAGEMENT SYSTEM (OMS)

## Purpose

Track and troubleshoot telecom order processing.

This is the most important support tool.

---

# New Admin Page

Route

/admin/orders

---

# Order Dashboard

Show

Created Orders

Completed Orders

Failed Orders

Pending Orders

Retry Queue

---

# Failed Orders Section

Route

/admin/orders/failed

---

# Features

View Failure Reason

Retry Order

Cancel Order

Escalate Order

Assign To Support

---

# Order Lifecycle Tracking

Every step should be recorded.

---

Customer Order

↓

Inventory Check

↓

SIM Allocation

↓

Wallet Validation

↓

Plan Assignment

↓

Activation Request

↓

Notification

↓

Completed

---

# New Database Table

## order_journey

id

order_id

step_name

system_name

status

request_payload

response_payload

error_message

created_at

---

# Example

Order:

ORD12345

Journey

1

Inventory Check

SUCCESS

2

SIM Allocation

SUCCESS

3

Wallet Validation

SUCCESS

4

Activation API

FAILED

Reason

Timeout

---

# New Page

Route

/admin/orders/{id}/journey

---

# Example UI

Order ID

ORD12345

Step

Inventory Check

SUCCESS

---

Step

SIM Allocation

SUCCESS

---

Step

Activation API

FAILED

Error

Connection Timeout

---

# Retry Engine

Support Agent clicks:

Retry Order

System restarts failed step.

Example

Activation Failed

↓

Retry Activation Only

↓

Do Not Reprocess Previous Steps

---

# APIs

GET /api/admin/orders

GET /api/admin/orders/failed

GET /api/admin/orders/{id}

GET /api/admin/orders/{id}/journey

POST /api/admin/orders/retry

POST /api/admin/orders/cancel

---

# MODULE 4: SYSTEM FLOW TRACKER

## Purpose

Track which internal service handled the request.

Useful for troubleshooting.

---

# New Database Table

service_execution_log

id

order_id

service_name

api_name

execution_time

status

error_message

created_at

---

# Example

Order

ORD12345

Auth Service

SUCCESS

---

Inventory Service

SUCCESS

---

Wallet Service

SUCCESS

---

Activation Service

FAILED

---

# New Page

Route

/ admin/system-tracker

---

# Features

Search By

Order ID

Customer ID

MSISDN

Service Name

---

# Integration With Kibana

Click

View Logs

↓

Open Kibana Filter

↓

service_name=activation-service

order_id=ORD12345

---

# IMPLEMENTATION ORDER

Phase 1

SIM Inventory Management

Estimated: 5 Days

---

Phase 2

Customer CRM

Estimated: 4 Days

---

Phase 3

Order Management System

Estimated: 7 Days

---

Phase 4

Order Journey Tracking

Estimated: 3 Days

---

Phase 5

System Flow Tracker

Estimated: 3 Days

---

Total

22 Days

---

# Expected Result

After implementation SmartSIM will have:

✔ Customer Portal

✔ SIM Inventory Management System

✔ Customer CRM

✔ Order Management System

✔ Failed Order Retry Engine

✔ Order Journey Tracking

✔ Service Execution Tracker

✔ Kibana Log Correlation

✔ Grafana Monitoring

✔ Telecom-Style Operations Dashboard

This structure is very similar to what support teams use in telecom environments, where a failed SIM activation can be traced step-by-step across inventory, wallet, provisioning, and activation systems, and retried without recreating the entire order.
