# SmartSIM Change Request - Customer Number Selection & Independent Operations Portals

# Objective

Enhance the current SmartSIM platform to behave like a real telecom operator's system.

The customer portal should allow customers to choose their preferred mobile number before placing an order, while the backend operations should be managed through separate internal web applications.

These changes must integrate with the existing microservice architecture without breaking existing functionality.

---

# Change 1: Preferred Mobile Number Selection

## Overview

Customers should be able to browse and reserve an available mobile number before placing an order.

This number selection should be tightly integrated with the SIM Inventory Management System.

---

## Customer Flow

Customer Login

↓

Browse Available Numbers

↓

Search Preferred Number

↓

Select Number

↓

Number Reserved

↓

Complete Customer Details

↓

Place Order

↓

SIM Allocation

↓

Activation

---

## Number Inventory

Create a dedicated mobile number inventory.

Each number should have one of the following states:

AVAILABLE

RESERVED

ALLOCATED

ACTIVATED

BLOCKED

RETIRED

---

## New Database Table

### mobile_number_inventory

Fields

* id
* msisdn
* circle
* operator
* category (Regular, Premium, VIP)
* status
* reserved_by_customer_id
* reserved_at
* reservation_expiry
* inventory_id (SIM Inventory Reference)
* created_at
* updated_at

---

## Customer Dashboard

New Page

/customer/select-number

### Features

Search Number

Filter by

* Circle
* Number Pattern
* Premium Numbers
* VIP Numbers

Examples

98XXXX0001

9876500000

9999901234

8800008888

---

### Number Reservation Logic

When customer clicks "Reserve Number":

Step 1

Verify number status = AVAILABLE

Step 2

Lock the record using a database transaction

Step 3

Update status to RESERVED

Step 4

Associate customer_id

Step 5

Set reservation expiry (example: 30 minutes)

Step 6

Hide this number from all other customers

If another customer requests the same number, return:

"This number has already been reserved."

---

## Reservation Expiry

If order is not completed before expiry:

* Release reservation
* Status becomes AVAILABLE
* Remove customer association

Implement an automatic cleanup job to release expired reservations.

---

# Change 2: SIM Allocation Logic

## Existing Inventory

SIM Inventory contains:

* ICCID
* IMSI

The selected MSISDN must now be linked with an available SIM during order processing.

Order Flow

Customer Selected MSISDN

↓

Find Available SIM

↓

Assign ICCID

↓

Assign IMSI

↓

Create SIM Assignment

↓

Reserve SIM

↓

Activate SIM

---

## New Database Table

### sim_assignment

Fields

* assignment_id
* order_id
* customer_id
* inventory_id
* msisdn
* iccid
* imsi
* assignment_status
* assigned_at

---

# Change 3: Customer Information Form

During SIM purchase, collect customer details.

---

## Customer Information Page

/customer/order/customer-information

### Mandatory Fields

Full Name

Father's Name (Optional)

Date of Birth

Gender

Email Address

Alternate Mobile Number

Address

City

State

PIN Code

Country

---

## Identity Verification

Customer selects ID Type

Supported IDs

* Aadhaar
* PAN
* Passport
* Driving License
* Voter ID

Capture

ID Number

Issue Date (Optional)

Expiry Date (Optional)

Document Upload (Future Enhancement)

---

## Validation

Required fields

Duplicate customer detection

Email validation

Mobile validation

---

# Change 4: CRM Integration

After successful order creation:

Automatically create or update customer profile in CRM.

---

## CRM Data

Customer Information

Identity Information

SIM Information

Current Plan

Wallet

Orders

Support Tickets

---

## CRM Timeline

Store customer activity.

Example

Customer Registered

↓

Number Reserved

↓

Order Created

↓

SIM Activated

↓

Recharge Completed

---

# Change 5: RMS Integration

(RMS = Resource/Relationship Management System)

Maintain inventory relationships.

Store

MSISDN

↓

ICCID

↓

IMSI

↓

Customer

↓

Order

↓

Plan

This provides complete traceability.

---

# Change 6: Independent Admin Applications

The operational modules must not be embedded inside the customer portal.

Each module should be an independent web application with its own routing and authentication.

---

## Application 1

SmartSIM Customer Portal

Purpose

Customer Self-Service

URL

https://portal.smartsim.local

Features

* Login
* Number Selection
* Buy SIM
* Buy Plan
* Wallet
* Orders
* Profile

---

## Application 2

SmartSIM CRM

Purpose

Customer Management

URL

https://crm.smartsim.local

Admin Login Required

Modules

* Customer Search
* Customer Profile
* Order History
* Wallet
* Support Tickets
* Activity Timeline

---

## Application 3

SmartSIM SIM Inventory Management

Purpose

SIM & Number Inventory

URL

https://inventory.smartsim.local

Admin Login Required

Modules

* Upload ICCID/IMSI Inventory
* Upload Number Inventory
* View Inventory
* SIM Assignment
* Inventory Reports
* Search by ICCID
* Search by IMSI
* Search by MSISDN

---

## Application 4

SmartSIM Order Management System (OMS)

Purpose

Order Processing & Troubleshooting

URL

https://oms.smartsim.local

Admin Login Required

Modules

* Active Orders
* Pending Orders
* Failed Orders
* Retry Queue
* Order Journey
* System Execution Logs

---

# Change 7: OMS Enhancements

Every order must maintain a complete execution history.

Example

Order Created

↓

Customer Validation

↓

MSISDN Reserved

↓

SIM Allocated

↓

Wallet Verified

↓

Plan Assigned

↓

Activation API

↓

Notification Sent

Each step must store:

* Step Name
* Service Name
* Request
* Response
* Execution Time
* Status
* Error Message

---

# Change 8: Retry Engine

Support agents should be able to retry failed processing steps.

Example

Activation API Failed

↓

Open OMS

↓

View Order

↓

Retry Activation

Only the failed step should be reprocessed.

Previously successful steps must not run again.

---

# Change 9: Role-Based Authentication

Customer Portal

Role

CUSTOMER

CRM

Roles

SUPPORT_AGENT

OPERATIONS_ADMIN

SUPER_ADMIN

SIM Inventory

Roles

INVENTORY_ADMIN

SUPER_ADMIN

OMS

Roles

OPERATIONS_ADMIN

SYSTEM_ADMIN

SUPER_ADMIN

JWT tokens must include role information and every application must enforce authorization.

---

# Change 10: API Integrations

Portal → Number Service

Portal → Auth Service

Portal → Order Service

Portal → Wallet Service

Order Service → Inventory Service

Order Service → CRM Service

Order Service → RMS Service

Order Service → Notification Service

OMS → Order Service

CRM → Customer Service

Inventory → SIM Service

All APIs must expose:

* Swagger Documentation
* Health Endpoint
* Structured JSON Responses
* Correlation ID for request tracing

---

# Change 11: UI Requirements

Each application must have its own branding, login screen, navigation, and dashboard.

Customer Portal

Blue theme

CRM

Green theme

Inventory

Orange theme

OMS

Purple theme

Each application should feel like a standalone enterprise system while sharing the same authentication service and backend microservices.

---

# Expected Deliverables

1. Customer Number Selection Module
2. Mobile Number Reservation Engine
3. Automatic SIM (ICCID/IMSI) Assignment Logic
4. Customer Information & KYC Form
5. CRM Auto-Update Integration
6. RMS Relationship Mapping
7. Independent CRM Web Application
8. Independent SIM Inventory Web Application
9. Independent OMS Web Application
10. Order Journey Tracking
11. Failed Order Retry Engine
12. Reservation Expiry Scheduler
13. Updated Database Schema
14. Updated API Documentation
15. Updated Docker Compose Configuration
16. Role-Based Authentication Across All Applications
17. Integration and End-to-End Tests
