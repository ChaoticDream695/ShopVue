-- Run this to initialize the database
CREATE TABLE IF NOT EXISTS users_auth(
  uauth_id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(150) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'customer')),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers(
  customer_id SERIAL PRIMARY KEY,
  firstname VARCHAR(200) NOT NULL,
  lastname VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  cuauth_id INT NOT NULL,
  CONSTRAINT fk_users_auth FOREIGN KEY(cuauth_id)
    REFERENCES users_auth(uauth_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_categories(
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_description VARCHAR(150) DEFAULT 'No description',
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products(
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(100) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  category_id INT NOT NULL,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_categories FOREIGN KEY(category_id)
    REFERENCES product_categories(category_id)
);

CREATE TABLE IF NOT EXISTS orders(
  order_id SERIAL PRIMARY KEY,
  total_amount NUMERIC(12,2) NOT NULL,
  order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  customer_id INT NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  CONSTRAINT fk_customers FOREIGN KEY(customer_id)
    REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS order_items(
  order_id INT,
  product_id INT,
  quantity INT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  PRIMARY KEY(order_id, product_id)
);

ALTER TABLE order_items ADD CONSTRAINT fk_orders
  FOREIGN KEY(order_id) REFERENCES orders(order_id);
ALTER TABLE order_items ADD CONSTRAINT fk_products
  FOREIGN KEY(product_id) REFERENCES products(product_id);
