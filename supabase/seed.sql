-- ============================================
-- SEED DATA - Jones Legacy Creations
-- Run this AFTER schema.sql to populate test data
-- ============================================

-- Contractors Directory
insert into contractors (id, name, company, email, phone, trade, license_number, notes) values
  ('c0000000-0001-4000-8000-000000000001', 'Mike Rodriguez', 'Pro Plumbing Co', 'mike@proplumbing.com', '435-555-0201', 'Plumbing', 'PL-2024-0891', 'Reliable, fair pricing. Preferred for residential.'),
  ('c0000000-0002-4000-8000-000000000002', 'Jake Turner', 'Sparks Electric', 'jake@sparkselectric.com', '435-555-0202', 'Electrical', 'EL-2023-1432', 'Licensed for commercial and residential.'),
  ('c0000000-0003-4000-8000-000000000003', 'Carlos Mendez', 'Utah Granite Works', 'carlos@utahgranite.com', '435-555-0203', 'Cabinetry', null, 'Custom countertop fab and install. 2-3 week lead time.'),
  ('c0000000-0004-4000-8000-000000000004', 'Tom Baker', 'Desert Foundation Inc', 'tom@desertfoundation.com', '435-555-0204', 'Concrete', 'GC-2022-0567', 'Foundation specialist. Does grading too.'),
  ('c0000000-0005-4000-8000-000000000005', 'Ryan Scott', 'Cool Air HVAC', 'ryan@coolairhvac.com', '435-555-0205', 'HVAC', 'HV-2024-0234', 'Commercial and residential HVAC.'),
  ('c0000000-0006-4000-8000-000000000006', 'Dave Wilson', 'Concrete Masters', 'dave@concretemasters.com', '435-555-0206', 'Concrete', 'CM-2023-0891', 'Stamped concrete specialist.'),
  ('c0000000-0007-4000-8000-000000000007', 'Mark Johnson', 'Steel Structures LLC', 'mark@steelstructures.com', '435-555-0207', 'Steel/Welding', 'SS-2022-1234', 'Commercial steel work. Large projects only.');

-- Projects
insert into projects (id, name, client_name, client_email, client_phone, address, city, state, zip, status, project_type, description, notes, estimated_value, contract_value, start_date, end_date) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Smith Kitchen Remodel', 'John Smith', 'john.smith@email.com', '435-555-0101', '1234 Red Rock Dr', 'Hurricane', 'UT', '84737', 'in_progress', 'renovation', 'Full kitchen remodel including new cabinets, countertops, and appliances', 'Client prefers quartz countertops. Budget is flexible for quality materials.', 45000.00, 42500.00, '2026-02-15', null),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Garcia New Home Build', 'Maria Garcia', 'maria.garcia@email.com', '435-555-0102', '5678 Mesa View Ln', 'St. George', 'UT', '84770', 'waiting_on_permit', 'residential', 'Custom 3BR/2BA home build on vacant lot', 'Waiting on city building permit. Plans submitted 3/1. Investor: Mountain West Capital.', 320000.00, 298000.00, '2026-04-01', null),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Thompson Bathroom Renovation', 'Dave Thompson', 'dave.t@email.com', '435-555-0103', '910 Sunset Blvd', 'Hurricane', 'UT', '84737', 'estimate_sent', 'renovation', 'Master bathroom full renovation', 'Sent estimate on 3/10. Follow up next week.', 22000.00, null, null, null),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Riverside Office Buildout', 'Riverside LLC', 'info@riverside.com', '435-555-0104', '200 Main St Suite 4', 'St. George', 'UT', '84770', 'approved', 'commercial', 'Commercial office tenant improvement', 'Contract signed. Waiting on material delivery.', 85000.00, 82000.00, '2026-03-20', null),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Williams Deck & Patio', 'Sarah Williams', 'sarah.w@email.com', '435-555-0105', '456 Canyon View Rd', 'LaVerkin', 'UT', '84745', 'completed', 'residential', 'New composite deck and stamped concrete patio', 'Project completed. Final invoice paid.', 18500.00, 18500.00, '2026-01-10', '2026-03-01'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Brown Fence Installation', 'Mike Brown', 'mike.b@email.com', '435-555-0106', '789 Desert Rose Way', 'Hurricane', 'UT', '84737', 'waiting_on_payment', 'residential', 'Vinyl fence installation - full property', 'Work complete. Invoice sent, awaiting payment.', 8500.00, 8500.00, '2026-03-01', '2026-03-15'),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Henderson Interior Design', 'Lisa Henderson', 'lisa.h@email.com', '435-555-0107', '321 Lava Flow Dr', 'St. George', 'UT', '84770', 'lead', 'interior_design', 'Full home interior design consultation', 'Referral from Sarah Williams. Initial call scheduled for 3/28.', 12000.00, null, null, null),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'City Park Pavilion', 'Hurricane City', 'parks@hurricanecity.gov', '435-555-0108', 'Pioneer Park', 'Hurricane', 'UT', '84737', 'archived', 'commercial', 'Pavilion construction for city park', 'Completed Nov 2025. Warranty period active.', 95000.00, 95000.00, '2025-08-01', '2025-11-15');

-- Invoices
insert into invoices (project_id, invoice_number, description, amount, status, due_date, paid_date) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'INV-2026-001', 'Deposit - 50%', 22500.00, 'paid', '2026-02-15', '2026-02-14'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'INV-2026-002', 'Progress payment - cabinets installed', 11250.00, 'sent', '2026-03-30', null),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'INV-2026-003', 'Deposit - 10%', 32000.00, 'paid', '2026-03-01', '2026-03-01'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'INV-2026-004', 'Deposit - 30%', 25500.00, 'paid', '2026-03-15', '2026-03-14'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'INV-2026-005', 'Progress payment - framing complete', 25500.00, 'draft', '2026-04-15', null),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'INV-2026-006', 'Final payment - project complete', 18500.00, 'paid', '2026-03-01', '2026-03-05'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'INV-2026-007', 'Full project - fence installation', 8500.00, 'overdue', '2026-03-20', null),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'INV-2025-010', 'Final payment', 95000.00, 'paid', '2025-11-30', '2025-12-02');

-- Contractor Payments (now linked to contractor directory)
insert into contractor_payments (project_id, contractor_id, contractor_name, description, amount, status, due_date, paid_date) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'c0000000-0001-4000-8000-000000000001', 'Pro Plumbing Co', 'Rough-in plumbing for kitchen', 3200.00, 'paid', '2026-03-01', '2026-03-01'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'c0000000-0002-4000-8000-000000000002', 'Sparks Electric', 'Electrical work - kitchen circuits', 2800.00, 'pending', '2026-03-25', null),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'c0000000-0003-4000-8000-000000000003', 'Utah Granite Works', 'Countertop fabrication & install', 6500.00, 'pending', '2026-04-10', null),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'c0000000-0004-4000-8000-000000000004', 'Desert Foundation Inc', 'Foundation pour', 28000.00, 'pending', '2026-04-15', null),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'c0000000-0002-4000-8000-000000000002', 'Sparks Electric', 'Commercial electrical rough-in', 12000.00, 'paid', '2026-03-20', '2026-03-19'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'c0000000-0005-4000-8000-000000000005', 'Cool Air HVAC', 'HVAC installation', 8500.00, 'pending', '2026-04-01', null),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'c0000000-0006-4000-8000-000000000006', 'Concrete Masters', 'Stamped concrete patio', 4200.00, 'paid', '2026-02-20', '2026-02-20'),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'c0000000-0007-4000-8000-000000000007', 'Steel Structures LLC', 'Pavilion steel framework', 32000.00, 'paid', '2025-09-15', '2025-09-14');

-- Draw Requests (for the Garcia new home build with investor financing)
insert into draw_requests (project_id, draw_number, description, amount, status, submitted_date, funded_date, notes) values
  ('a1b2c3d4-0002-4000-8000-000000000002', 1, 'Lot purchase and site prep', 45000.00, 'funded', '2026-02-20', '2026-02-28', 'Mountain West Capital - Draw #1'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 2, 'Foundation and grading', 38000.00, 'submitted', '2026-03-15', null, 'Awaiting inspector sign-off'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 3, 'Framing package', 52000.00, 'draft', null, null, 'Will submit after permit approval');

-- Permits
insert into permits (project_id, permit_type, permit_number, status, applied_date, approved_date, expiry_date, notes) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Building Permit', 'BP-2026-0142', 'approved', '2026-01-20', '2026-02-10', '2027-02-10', 'Approved for kitchen remodel scope'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Building Permit', null, 'applied', '2026-03-01', null, null, 'Submitted plans to city. Typical 4-6 week review.'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Grading Permit', 'GP-2026-0089', 'approved', '2026-02-15', '2026-02-28', '2027-02-28', null),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Commercial Build-out Permit', 'CB-2026-0031', 'approved', '2026-02-20', '2026-03-10', '2027-03-10', null),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Building Permit', 'BP-2025-0298', 'approved', '2025-12-15', '2026-01-05', '2027-01-05', null),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Commercial Building Permit', 'CB-2025-0015', 'approved', '2025-07-01', '2025-07-20', '2026-07-20', null);

-- Tasks
insert into tasks (project_id, title, completed, due_date, sort_order) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Demo old kitchen', true, '2026-02-20', 1),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Rough plumbing', true, '2026-02-28', 2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Electrical rough-in', false, '2026-03-25', 3),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Install cabinets', false, '2026-04-01', 4),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Countertop install', false, '2026-04-10', 5),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Final inspection', false, '2026-04-20', 6),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Get building permit', false, '2026-04-01', 1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Site prep & grading', false, '2026-04-15', 2),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Foundation pour', false, '2026-05-01', 3),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Framing', false, '2026-06-01', 4),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Framing walls', true, '2026-03-25', 1),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Electrical rough-in', true, '2026-03-28', 2),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'HVAC installation', false, '2026-04-01', 3),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Drywall & paint', false, '2026-04-10', 4),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Flooring', false, '2026-04-15', 5),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Follow up on payment', false, '2026-03-25', 1),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Schedule initial consultation', false, '2026-03-28', 1),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Prepare mood boards', false, '2026-04-05', 2);

-- Activity Log
insert into activity_log (project_id, action, description, created_at) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'status_change', 'Status changed to In Progress', '2026-02-15T09:00:00Z'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'invoice_paid', 'Invoice INV-2026-001 marked as paid ($22,500)', '2026-02-14T14:30:00Z'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'payment_made', 'Paid Pro Plumbing Co $3,200 for rough-in plumbing', '2026-03-01T10:00:00Z'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'task_completed', 'Completed: Demo old kitchen', '2026-02-20T16:00:00Z'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'task_completed', 'Completed: Rough plumbing', '2026-02-28T15:00:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'project_created', 'Project created', '2026-02-10T08:00:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'status_change', 'Status changed to Waiting on Permit', '2026-03-01T09:00:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'draw_submitted', 'Draw Request #2 submitted for $38,000', '2026-03-15T11:00:00Z'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'status_change', 'Status changed to Waiting on Payment', '2026-03-15T17:00:00Z');

-- Estimates (from website)
insert into estimates (client_name, client_email, client_phone, project_type, description, address, city, state, zip, square_footage, budget_range, timeline, estimated_min, estimated_max, status) values
  ('Tom Richards', 'tom.r@email.com', '435-555-0301', 'kitchen_remodel', 'Want to update our 1990s kitchen. New cabinets, counters, flooring. Keep same layout.', '555 Vermillion Cliffs Dr', 'Hurricane', 'UT', '84737', 180, '$25,000 - $50,000', '3-6 months', 18000.00, 45000.00, 'new'),
  ('Amy Chen', 'amy.chen@email.com', '435-555-0302', 'new_home', 'Looking to build on our lot in Toquerville. 2500 sq ft, 4BR/3BA, modern farmhouse style.', 'Lot 14 Toquerville Heights', 'Toquerville', 'UT', '84774', 2500, '$250,000 - $500,000', '6-12 months', 375000.00, 875000.00, 'new');
