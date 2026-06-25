-- Seed Script for SmartSIM DB

-- 1. Create default admin and customer users
INSERT INTO users (name, email, mobile, password_hash, role, is_active, created_at)
VALUES 
('Admin User', 'admin@smartsim.com', '9999999999', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'admin', true, NOW()),
('Alice Customer', 'customer@smartsim.com', '9888888888', '$2b$12$d7PIqaAI4/rRHuxSsruOcu57Yfhgr6C/dsEs60PcNMpucEu85MFfa', 'customer', true, NOW()),
('Support Agent', 'support@smartsim.com', '9111111111', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'support_agent', true, NOW()),
('Inventory Admin', 'inventory@smartsim.com', '9222222222', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'inventory_admin', true, NOW()),
('Operations Admin', 'operations@smartsim.com', '9333333333', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'operations_admin', true, NOW()),
('System Admin', 'system@smartsim.com', '9444444444', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'system_admin', true, NOW()),
('Super Admin', 'superadmin@smartsim.com', '9555555555', '$2b$12$prxkBr84GFxDRgKPevVlM.uHz9wTJnrxfNO9VzBYEwgOULGt6erUC', 'super_admin', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Create catalog SIM products
INSERT INTO sims (id, name, type, price, description, iccid_prefix, is_active, created_at)
VALUES 
(1, 'Super 5G Physical SIM', 'physical', 150.00, '5G High Speed SIM card Package', '8991', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create catalog Plan products
INSERT INTO plans (id, name, price, data_gb, validity_days, type, description, created_at)
VALUES 
(1, '50GB Monthly Pack', 350.00, 50, 30, 'data', 'Premium 50GB pack with talktime', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Seed available stock in sim_inventory
INSERT INTO sim_inventory (sim_id, iccid, status, imsi, sim_type, circle, uploaded_at, created_at)
VALUES 
(1, '899100000000001', 'AVAILABLE', '404450001001001', 'PREPAID', 'DELHI', NOW(), NOW()),
(1, '899100000000002', 'AVAILABLE', '404450001001002', 'PREPAID', 'DELHI', NOW(), NOW()),
(1, '899100000000003', 'AVAILABLE', '404450001001003', 'PREPAID', 'DELHI', NOW(), NOW()),
(1, '899100000000004', 'AVAILABLE', '404450001001004', 'PREPAID', 'DELHI', NOW(), NOW()),
(1, '899100000000005', 'AVAILABLE', '404450001001005', 'PREPAID', 'DELHI', NOW(), NOW())
ON CONFLICT (iccid) DO NOTHING;

-- 5. Seed mobile number inventory
INSERT INTO mobile_number_inventory (msisdn, circle, operator, category, status, created_at, updated_at)
VALUES
('9876500001', 'DELHI', 'SmartSIM', 'Regular', 'AVAILABLE', NOW(), NOW()),
('9876500002', 'DELHI', 'SmartSIM', 'Regular', 'AVAILABLE', NOW(), NOW()),
('9876500003', 'DELHI', 'SmartSIM', 'Regular', 'AVAILABLE', NOW(), NOW()),
('9999901234', 'DELHI', 'SmartSIM', 'Premium', 'AVAILABLE', NOW(), NOW()),
('8800008888', 'DELHI', 'SmartSIM', 'VIP', 'AVAILABLE', NOW(), NOW())
ON CONFLICT (msisdn) DO NOTHING;
