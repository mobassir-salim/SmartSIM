# NOTIFICATION_PLATFORM_PLAN.md

# SmartSIM Enterprise Notification Platform

## Version

1.0

---

# Objective

Build a centralized notification platform for SmartSIM that is independent of business services.

The Notification Platform will be responsible for routing all customer communications through different channels while keeping business services completely unaware of how notifications are delivered.

The platform must support:

* WhatsApp
* SMS
* Email
* Push Notifications (Future)

It should work in Development, QA, Staging and Production environments.

---

# Design Principles

* Event Driven Architecture
* Independent Microservices
* Loose Coupling
* High Availability
* Retry Mechanism
* Audit Logging
* Centralized Configuration
* Channel Agnostic
* Environment Aware

---

# High Level Architecture

Customer Portal

↓

API Gateway

↓

Business Services

* Auth Service
* CRM
* Inventory
* Wallet
* OMS
* Plan Service

↓

RabbitMQ

↓

Notification Service

↓

Notification Router

↓

---

WhatsApp Service

SMS Service

Email Service

Push Notification Service (Future)

---

↓

Customer

---

# Why Notification Router?

Business Services should NEVER know:

* Customer WhatsApp Number
* SMS Provider
* Email Provider
* Test Numbers

They simply publish events.

Example

Order Service

↓

OrderCompleted Event

↓

Notification Service

↓

Notification Router

↓

WhatsApp Service

↓

Customer

---

# Notification Service

## Responsibilities

* Subscribe to RabbitMQ
* Read business events
* Select notification template
* Determine notification channels
* Call Notification Router

The Notification Service does NOT send messages directly.

---

# Notification Router

## Responsibilities

The Notification Router decides:

* Which provider to use
* Which destination to use
* Whether application is Development or Production
* Retry strategy
* Fallback channel

---

# Environment Modes

## Development

Purpose

Local development

Destination

Developer Test Numbers

Real customer numbers are ignored.

---

## QA

Purpose

Internal testing

Destination

QA Team Numbers

---

## Staging

Purpose

Pre-production testing

Destination

Approved UAT users

---

## Production

Purpose

Live Environment

Destination

Actual customer numbers

---

# Notification Routing Logic

## Development

Customer Database

↓

Notification Router

↓

Developer Number

↓

WhatsApp

Every notification goes to configured test numbers.

---

## Production

Customer Database

↓

Notification Router

↓

Customer WhatsApp Number

↓

WhatsApp

---

# Configuration

## Environment Variables

APP_ENV=development

NOTIFICATION_MODE=TEST

WHATSAPP_TEST_MODE=true

WHATSAPP_TEST_NUMBER=919999999999

SMS_TEST_MODE=true

SMS_TEST_NUMBER=919999999999

EMAIL_TEST_MODE=true

EMAIL_TEST_ADDRESS=[test@smartsim.local](mailto:test@smartsim.local)

---

# Routing Rules

If

APP_ENV=development

Then

Destination

Developer Number

If

APP_ENV=production

Destination

Customer Number

---

# Notification Channels

## WhatsApp

Provider

OpenWA

Status

Phase 1

---

## SMS

Provider

Mock SMS Service

Future

MSG91

Twilio

AWS SNS

---

## Email

Provider

MailHog (Development)

SMTP (Production)

---

## Push Notifications

Future

Firebase Cloud Messaging

---

# WhatsApp Service

Port

8010

Responsibilities

* Send Messages
* Send OTP
* Receive Webhooks
* Track Delivery
* Manage Sessions

---

# SMS Service

Port

8011

Responsibilities

* Send SMS
* OTP
* Delivery Reports

Initially use a mock implementation.

---

# Email Service

Port

8012

Responsibilities

* Send Email
* HTML Templates
* Attachments
* Delivery Tracking

---

# Notification Templates

## Customer Registered

Welcome to SmartSIM.

---

## OTP

Your verification code is

{{otp}}

---

## Number Reserved

Your selected mobile number

{{msisdn}}

has been reserved.

Reservation expires in

30 minutes.

---

## SIM Activated

Your SIM is now active.

MSISDN

{{msisdn}}

---

## Order Completed

Order Number

{{order_id}}

has been completed successfully.

---

## Wallet Credit

₹{{amount}}

credited successfully.

---

## Recharge Successful

Recharge completed.

Plan

{{plan}}

---

## Support Ticket Closed

Your support ticket has been resolved.

---

# Notification Database

## notification_queue

Stores pending notifications.

Fields

* id
* event_type
* customer_id
* priority
* status
* retry_count
* created_at

---

## notification_history

Stores completed notifications.

Fields

* id
* customer_id
* channel
* provider
* destination
* template
* message
* status
* sent_at

---

## notification_router_log

Stores routing decisions.

Fields

* id
* event
* selected_channel
* destination
* environment
* routing_reason
* created_at

---

# Retry Strategy

Retry

1 minute

↓

5 minutes

↓

15 minutes

↓

30 minutes

↓

Dead Letter Queue

---

# Dead Letter Queue

If notification fails after maximum retries

↓

Store in

notification_dlq

↓

Visible in Admin Dashboard

↓

Support can Retry

---

# Notification Priority

CRITICAL

OTP

SIM Activation

Wallet Debit

HIGH

Order Completed

Order Failed

MEDIUM

Recharge

Wallet Credit

LOW

Promotional Messages

---

# Notification Admin Portal

URL

https://notifications.smartsim.local

Modules

* Dashboard
* Queue
* History
* Templates
* Failed Notifications
* Retry Queue
* Routing Rules
* Environment Configuration

---

# Notification Dashboard

Cards

Pending Notifications

Failed Notifications

Messages Sent Today

Delivery Success Rate

Average Delivery Time

---

# Queue Page

Shows

Pending

Processing

Completed

Failed

Dead Letter Queue

---

# Failed Notification Page

Actions

Retry

Cancel

View Error

View Logs

---

# Routing Rules Page

View

Development Routing

Production Routing

QA Routing

Staging Routing

Edit

Test Numbers

Approved QA Numbers

Production Rules

---

# OpenWA Integration

Notification Service

↓

Notification Router

↓

WhatsApp Service

↓

OpenWA

↓

Customer

No business service communicates with OpenWA directly.

---

# Monitoring

Prometheus Metrics

notifications_sent_total

notifications_failed_total

queue_size

retry_count

delivery_latency

---

# Logging

Every routing decision must be logged.

Example

{
"event":"OrderCompleted",
"channel":"WhatsApp",
"environment":"Development",
"destination":"919999999999",
"reason":"Development Test Mode"
}

Logs must be searchable in Kibana.

---

# API Endpoints

Notification Service

POST /api/v1/notifications

GET /api/v1/notifications/status

GET /health

Notification Router

POST /api/v1/router/route

GET /api/v1/router/config

PUT /api/v1/router/config

WhatsApp Service

POST /api/v1/messages/send

POST /api/v1/messages/template

POST /api/v1/messages/otp

POST /api/v1/messages/webhook

SMS Service

POST /api/v1/sms/send

Email Service

POST /api/v1/email/send

---

# Docker Services

Add the following containers

notification-service

notification-router

whatsapp-service

openwa

sms-service

email-service

---

# Testing Strategy

## Unit Tests

* Routing Logic
* Environment Detection
* Retry Logic
* Template Rendering

---

## Integration Tests

Order Service

↓

RabbitMQ

↓

Notification Service

↓

Notification Router

↓

WhatsApp Service

↓

OpenWA

Verify message delivery.

---

## End-to-End Tests

Customer Registration

↓

Welcome Notification

Customer Orders SIM

↓

Number Reserved

↓

Order Confirmation

↓

SIM Activated

↓

Activation Notification

Customer Creates Ticket

↓

Ticket Closed

↓

Support Notification

---

# Future Enhancements

* Multi-provider WhatsApp support
* SMS provider failover
* Email provider failover
* Push notifications
* Scheduled notifications
* Campaign management
* AI-powered notification personalization
* Customer notification preferences
* Quiet hours / Do Not Disturb
* Notification analytics dashboard

---

# Success Criteria

The Notification Platform is considered complete when:

* Business services publish events only and never communicate directly with notification providers.
* Notification routing is environment-aware and supports Development, QA, Staging, and Production.
* Development mode routes all outbound messages to configurable test destinations.
* WhatsApp, SMS, and Email channels are independently deployable.
* All notifications are queued, logged, monitored, and retryable.
* Failed notifications are moved to a Dead Letter Queue for manual review.
* Kibana provides searchable logs for every notification.
* Prometheus and Grafana expose health, performance, queue, and delivery metrics.
* The platform can be extended with new notification channels without modifying existing business services.
