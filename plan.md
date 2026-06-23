# SmartSIM MVP Development Plan

## Project Overview

SmartSIM is a telecom SIM marketplace and customer self-care platform that allows users to:

* Register and login
* Browse SIM cards
* Browse plans and combos
* Add items to cart
* Purchase SIMs and plans
* Manage wallet balance
* View order history
* Track purchases

This MVP will be built as a modular monolithic application using:

### Technology Stack

#### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* Axios
* React Router

#### Backend

* FastAPI
* SQLAlchemy
* Pydantic
* JWT Authentication

#### Database

* PostgreSQL

#### Infrastructure

* Docker
* Docker Compose

---

# Phase 1: Project Setup

## Goals

Establish project structure and development environment.

### Tasks

* Create Git repository
* Create backend project
* Create frontend project
* Configure PostgreSQL
* Configure Docker Compose
* Configure environment variables
* Create README.md

### Deliverables

* Running FastAPI application
* Running React application
* PostgreSQL connection established
* Docker Compose working

### Success Criteria

* Backend accessible on port 8000
* Frontend accessible on port 5173
* Database connection verified

---

# Phase 2: Authentication Module

## Goals

Implement secure user registration and login.

### Features

#### Registration

Users can create accounts using:

* Name
* Email
* Mobile Number
* Password

#### Login

Users can login using:

* Email
* Password

#### Security

* Password hashing using bcrypt
* JWT Access Tokens
* JWT Refresh Tokens
* Protected routes

### Database Tables

#### users

* id
* name
* email
* mobile
* password_hash
* role
* created_at

### API Endpoints

POST /api/auth/register

POST /api/auth/login

POST /api/auth/refresh

GET /api/auth/profile

### Deliverables

* User registration
* User login
* JWT authentication
* Protected API routes

### Success Criteria

* User can register
* User can login
* User receives JWT token
* Protected routes require authentication

---

# Phase 3: SIM Catalog Module

## Goals

Allow users to browse available SIM cards.

### Features

#### SIM Listing

* Prepaid SIM
* Postpaid SIM
* eSIM

#### Search

* By SIM type
* By network

#### Filtering

* Price
* Availability

### Database Tables

#### sims

* id
* sim_number
* sim_type
* network
* price
* status

### API Endpoints

GET /api/sims

GET /api/sims/{id}

POST /api/sims

PUT /api/sims/{id}

DELETE /api/sims/{id}

### Deliverables

* SIM listing page
* SIM details page
* Admin SIM management

### Success Criteria

* Users can browse SIMs
* Admin can manage SIMs

---

# Phase 4: Plans Module

## Goals

Allow users to browse telecom plans.

### Features

#### Plan Types

* Data Plans
* Voice Plans
* Combo Plans
* International Plans

### Database Tables

#### plans

* id
* name
* validity
* data_limit
* voice_limit
* sms_limit
* price

### API Endpoints

GET /api/plans

GET /api/plans/{id}

POST /api/plans

PUT /api/plans/{id}

DELETE /api/plans/{id}

### Deliverables

* Plans page
* Plan details page
* Admin plan management

### Success Criteria

* Plans displayed correctly
* Plans can be managed by admin

---

# Phase 5: Cart Module

## Goals

Allow users to collect products before purchasing.

### Features

* Add SIM to cart
* Add Plan to cart
* Remove item
* Update quantity
* Calculate total amount

### Database Tables

#### cart

* id
* user_id
* item_type
* item_id
* quantity

### API Endpoints

POST /api/cart/add

GET /api/cart

PUT /api/cart/{id}

DELETE /api/cart/{id}

### Deliverables

* Cart page
* Cart summary
* Quantity management

### Success Criteria

* Items can be added and removed
* Total amount calculated correctly

---

# Phase 6: Wallet Module

## Goals

Provide prepaid wallet functionality.

### Features

* Wallet creation
* Add money
* View balance
* Transaction history

### Database Tables

#### wallets

* id
* user_id
* balance

#### wallet_transactions

* id
* wallet_id
* transaction_type
* amount
* created_at

### API Endpoints

GET /api/wallet

POST /api/wallet/add-money

GET /api/wallet/transactions

### Deliverables

* Wallet page
* Balance display
* Transaction history

### Success Criteria

* Wallet balance updates correctly
* Transactions recorded properly

---

# Phase 7: Orders Module

## Goals

Allow users to purchase products.

### Features

* Create order
* View orders
* View order details
* Order status tracking

### Order Flow

Cart
→ Create Order
→ Verify Wallet Balance
→ Deduct Wallet
→ Complete Order

### Database Tables

#### orders

* id
* user_id
* amount
* status
* created_at

#### order_items

* id
* order_id
* item_type
* item_id
* quantity
* price

### API Endpoints

POST /api/orders

GET /api/orders

GET /api/orders/{id}

### Deliverables

* Order placement
* Order history
* Order details

### Success Criteria

* Orders created successfully
* Wallet deducted correctly
* Order history visible

---

# Phase 8: Frontend Development

## Pages

### Public

* Home
* Login
* Register
* SIM Catalog
* Plan Catalog

### Customer

* Dashboard
* Profile
* Wallet
* Cart
* Orders

### Admin

* SIM Management
* Plan Management
* Orders Management

### Deliverables

* Responsive UI
* Authentication flow
* API integration

### Success Criteria

* All APIs integrated
* Responsive design
* User-friendly navigation

---

# Phase 9: Dockerization

## Goals

Containerize application.

### Containers

* frontend
* backend
* postgres

### Files

* Dockerfile (frontend)
* Dockerfile (backend)
* docker-compose.yml

### Success Criteria

Single command deployment:

docker compose up -d

---

# Phase 10: Linux Deployment

## Target Environment

Ubuntu Server 24.04

### Installation

* Docker
* Docker Compose
* Nginx

### Deployment Steps

* Clone repository
* Configure environment variables
* Run Docker Compose
* Configure reverse proxy

### Success Criteria

* Application accessible publicly
* SSL enabled
* Persistent database storage

---

# Future Enhancements

## Version 2

* Redis Caching
* RabbitMQ
* Notifications
* OTP Login
* Payment Gateway Integration
* Recharge Functionality

## Version 3

* Microservices Architecture
* Jenkins CI/CD
* Kubernetes
* Monitoring with Prometheus
* Grafana Dashboards
* Centralized Logging

