-- Table already exists as `Products` — insert sample rows only
-- Run in phpMyAdmin → database ip_std6730202092 → SQL

INSERT INTO `Products` (Productcode, Name, Stock, Category, Location, Status, image)
VALUES
  ('SKU-001', 'Classic Tote', 12, 'Tote', 'Warehouse A', 'Active', NULL),
  ('SKU-002', 'Heritage Clutch', 3, 'Heritage Clutch', 'Warehouse B', 'Low in stock', NULL),
  ('SKU-003', 'Structured Handbag', 0, 'Structured Handbag', 'Warehouse A', 'Out of Stock', NULL);
