-- ============================================
-- SISTEMA DE GESTIÓN HOTELERA - BASE DE DATOS
-- Incluye TODAS las 55 funcionalidades
-- ============================================

CREATE DATABASE IF NOT EXISTS hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_management;

-- ============================================
-- TABLA: users (Administradores y Cajeros)
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cashier') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: permissions (Roles y Permisos)
-- ============================================
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    can_create_bookings BOOLEAN DEFAULT TRUE,
    can_modify_bookings BOOLEAN DEFAULT FALSE,
    can_cancel_bookings BOOLEAN DEFAULT FALSE,
    can_apply_discounts BOOLEAN DEFAULT FALSE,
    max_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    can_process_refunds BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_inventory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLA: rooms (Habitaciones)
-- ============================================
CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type ENUM('simple', 'doble', 'suite', 'ejecutiva') NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    short_stay_3h_price DECIMAL(10,2) NULL,
    short_stay_6h_price DECIMAL(10,2) NULL,
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    floor INT NULL,
    max_occupancy INT DEFAULT 2,
    description TEXT NULL,
    amenities JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_room_type (room_type)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: pricing_rules (Tarifas Dinámicas)
-- ============================================
CREATE TABLE pricing_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    room_id INT NULL,
    rule_type ENUM('season', 'weekday', 'early_checkin', 'late_checkout', 'promotion') NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    days_of_week JSON NULL, -- [1,2,3,4,5,6,7] donde 1=Lunes
    time_from TIME NULL,
    time_to TIME NULL,
    price_modifier_type ENUM('fixed', 'percentage') NOT NULL,
    price_modifier_value DECIMAL(10,2) NOT NULL,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: customers (Clientes)
-- ============================================
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    document_type ENUM('CI', 'PASAPORTE', 'OTRO') DEFAULT 'CI',
    document_number VARCHAR(50) NULL,
    phone VARCHAR(20) NULL,
    whatsapp VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Bolivia',
    is_frequent BOOLEAN DEFAULT FALSE,
    bad_behavior_flag BOOLEAN DEFAULT FALSE,
    behavior_notes TEXT NULL,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    total_stays INT DEFAULT 0,
    last_stay_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    INDEX idx_phone (phone),
    INDEX idx_document (document_number),
    INDEX idx_frequent (is_frequent)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: bookings (Reservas/Hospedajes)
-- ============================================
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    admin_id INT NOT NULL,
    cashier_id INT NOT NULL,
    customer_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME NULL,
    expected_checkout DATETIME NULL,
    stay_type ENUM('daily', '3_hours', '6_hours') DEFAULT 'daily',
    number_of_nights INT DEFAULT 1,
    number_of_guests INT DEFAULT 1,
    base_price DECIMAL(10,2) NOT NULL,
    additional_charges DECIMAL(10,2) DEFAULT 0.00,
    discounts DECIMAL(10,2) DEFAULT 0.00,
    early_checkin_charge DECIMAL(10,2) DEFAULT 0.00,
    late_checkout_charge DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    status ENUM('reserved', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'checked_in',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    INDEX idx_booking_code (booking_code),
    INDEX idx_status (status),
    INDEX idx_dates (check_in, check_out),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: products (Productos y Servicios POS)
-- ============================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    category ENUM('minibar', 'restaurant', 'laundry', 'spa', 'other') NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    stock_quantity INT DEFAULT 0,
    track_inventory BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: booking_charges (Cargos Adicionales)
-- ============================================
CREATE TABLE booking_charges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    product_id INT NULL,
    cashier_id INT NOT NULL,
    charge_type ENUM('product', 'service', 'penalty', 'other') DEFAULT 'product',
    description VARCHAR(200) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    INDEX idx_booking (booking_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: payments (Pagos)
-- ============================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    cashier_id INT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'check', 'other') NOT NULL,
    card_last_digits VARCHAR(4) NULL,
    transaction_reference VARCHAR(100) NULL,
    notes TEXT NULL,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    INDEX idx_booking (booking_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: payment_splits (Pagos Mixtos)
-- ============================================
CREATE TABLE payment_splits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'check') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    card_last_digits VARCHAR(4) NULL,
    transaction_reference VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLA: refunds (Devoluciones)
-- ============================================
CREATE TABLE refunds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    payment_id INT NULL,
    cashier_id INT NOT NULL,
    authorized_by INT NOT NULL,
    refund_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (authorized_by) REFERENCES users(id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: discounts (Descuentos)
-- ============================================
CREATE TABLE discounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    cashier_id INT NOT NULL,
    authorized_by INT NULL,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    requires_authorization BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: cash_registers (Cajas)
-- ============================================
CREATE TABLE cash_registers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cashier_id INT NOT NULL,
    opening_time DATETIME NOT NULL,
    closing_time DATETIME NULL,
    initial_cash DECIMAL(10,2) NOT NULL,
    expected_cash DECIMAL(10,2) DEFAULT 0.00,
    actual_cash DECIMAL(10,2) NULL,
    difference DECIMAL(10,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
    total_cash_payments DECIMAL(10,2) DEFAULT 0.00,
    total_card_payments DECIMAL(10,2) DEFAULT 0.00,
    total_transfer_payments DECIMAL(10,2) DEFAULT 0.00,
    total_check_payments DECIMAL(10,2) DEFAULT 0.00,
    total_refunds DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('open', 'closed', 'pending_approval', 'approved', 'rejected') DEFAULT 'open',
    notes TEXT NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cashier (cashier_id),
    INDEX idx_status (status),
    INDEX idx_opening_time (opening_time)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: invoices (Facturas)
-- ============================================
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    cashier_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type ENUM('receipt', 'invoice', 'credit_note') DEFAULT 'receipt',
    customer_name VARCHAR(100) NOT NULL,
    customer_tax_id VARCHAR(50) NULL,
    customer_address TEXT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    pdf_path VARCHAR(255) NULL,
    electronic_signature VARCHAR(500) NULL,
    status ENUM('draft', 'issued', 'cancelled') DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: whatsapp_logs (Log de Mensajes)
-- ============================================
CREATE TABLE whatsapp_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NULL,
    payment_id INT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    message_type ENUM('payment_confirmation', 'checkout', 'charge_added', 'reminder', 'other') NOT NULL,
    message_content TEXT NOT NULL,
    sent_successfully BOOLEAN DEFAULT FALSE,
    error_message TEXT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_booking (booking_id),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: audit_logs (Auditoría del Sistema)
-- ============================================
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NULL,
    record_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: payment_reminders (Recordatorios)
-- ============================================
CREATE TABLE payment_reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_time TIME DEFAULT '10:00:00',
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'cancelled') DEFAULT 'pending',
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_reminder_date (reminder_date),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- INSERTAR DATOS INICIALES
-- ============================================

-- Administrador por defecto
INSERT INTO users (username, email, password, role, full_name, phone, is_active) VALUES
('admin', 'admin@hotel.com', '$2a$10$XvIY0yI5r3qP.iQX9YqQVOrGKZqMZ1M9g5xZ7B8LJtD8N9rJqGQGK', 'admin', 'Administrador Principal', '+59171234567', TRUE);
-- Contraseña: Admin123!

-- Cajero de prueba
INSERT INTO users (admin_id, username, email, password, role, full_name, phone, is_active) VALUES
(1, 'cajero1', 'cajero1@hotel.com', '$2a$10$XvIY0yI5r3qP.iQX9YqQVOrGKZqMZ1M9g5xZ7B8LJtD8N9rJqGQGK', 'cashier', 'Juan Pérez', '+59172345678', TRUE);
-- Contraseña: Cajero123!

-- Permisos para cajero
INSERT INTO permissions (user_id, can_create_bookings, can_apply_discounts, max_discount_percentage) VALUES
(2, TRUE, TRUE, 10.00);

-- Habitaciones de ejemplo
INSERT INTO rooms (admin_id, room_number, room_type, base_price, short_stay_3h_price, short_stay_6h_price, status, floor, max_occupancy) VALUES
(1, '101', 'simple', 150.00, 80.00, 120.00, 'available', 1, 2),
(1, '102', 'doble', 250.00, 130.00, 180.00, 'available', 1, 3),
(1, '201', 'suite', 400.00, NULL, NULL, 'available', 2, 4),
(1, '202', 'ejecutiva', 350.00, NULL, NULL, 'available', 2, 2);

-- Productos de ejemplo
INSERT INTO products (admin_id, category, name, price, tax_rate, is_active) VALUES
(1, 'minibar', 'Coca Cola 500ml', 12.00, 0.00, TRUE),
(1, 'minibar', 'Agua Mineral', 8.00, 0.00, TRUE),
(1, 'restaurant', 'Desayuno Buffet', 35.00, 0.00, TRUE),
(1, 'laundry', 'Lavado de Ropa (kg)', 15.00, 0.00, TRUE),
(1, 'other', 'WiFi Premium 24h', 20.00, 0.00, TRUE);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Ocupación actual
CREATE VIEW v_current_occupancy AS
SELECT 
    COUNT(DISTINCT r.id) as total_rooms,
    COUNT(DISTINCT CASE WHEN r.status = 'occupied' THEN r.id END) as occupied_rooms,
    ROUND((COUNT(DISTINCT CASE WHEN r.status = 'occupied' THEN r.id END) / COUNT(DISTINCT r.id)) * 100, 2) as occupancy_percentage
FROM rooms r
WHERE r.status != 'maintenance';

-- Vista: Ingresos del día
CREATE VIEW v_daily_revenue AS
SELECT 
    DATE(p.payment_date) as payment_date,
    COUNT(DISTINCT p.booking_id) as total_transactions,
    SUM(p.amount) as total_revenue,
    SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END) as card_revenue,
    SUM(CASE WHEN p.payment_method = 'transfer' THEN p.amount ELSE 0 END) as transfer_revenue
FROM payments p
GROUP BY DATE(p.payment_date);

-- Vista: Clientes frecuentes
CREATE VIEW v_frequent_customers AS
SELECT 
    c.id,
    c.full_name,
    c.phone,
    c.total_stays,
    c.total_spent,
    c.last_stay_date,
    c.bad_behavior_flag
FROM customers c
WHERE c.total_stays >= 3
ORDER BY c.total_spent DESC;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

DELIMITER //

-- Calcular precio de reserva con reglas dinámicas
CREATE PROCEDURE sp_calculate_booking_price(
    IN p_room_id INT,
    IN p_check_in DATETIME,
    IN p_check_out DATETIME,
    IN p_stay_type VARCHAR(20),
    OUT p_final_price DECIMAL(10,2)
)
BEGIN
    DECLARE v_base_price DECIMAL(10,2);
    DECLARE v_nights INT;
    DECLARE v_modifier DECIMAL(10,2) DEFAULT 0;
    
    SELECT base_price INTO v_base_price FROM rooms WHERE id = p_room_id;
    SET v_nights = DATEDIFF(p_check_out, p_check_in);
    
    IF p_stay_type = '3_hours' THEN
        SELECT short_stay_3h_price INTO v_base_price FROM rooms WHERE id = p_room_id;
        SET p_final_price = v_base_price;
    ELSEIF p_stay_type = '6_hours' THEN
        SELECT short_stay_6h_price INTO v_base_price FROM rooms WHERE id = p_room_id;
        SET p_final_price = v_base_price;
    ELSE
        SET p_final_price = v_base_price * v_nights;
    END IF;
END //

-- Actualizar estadísticas de cliente
CREATE PROCEDURE sp_update_customer_stats(IN p_customer_id INT)
BEGIN
    UPDATE customers c
    SET 
        total_stays = (SELECT COUNT(*) FROM bookings WHERE customer_id = p_customer_id AND status = 'checked_out'),
        total_spent = (SELECT COALESCE(SUM(amount_paid), 0) FROM bookings WHERE customer_id = p_customer_id),
        last_stay_date = (SELECT MAX(check_out) FROM bookings WHERE customer_id = p_customer_id AND status = 'checked_out')
    WHERE c.id = p_customer_id;
END //

DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ============================================

CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_payments_date_method ON payments(payment_date, payment_method);
CREATE INDEX idx_customers_frequent ON customers(is_frequent, total_spent);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================