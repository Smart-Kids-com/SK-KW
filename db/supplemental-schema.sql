    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT, phone TEXT,
      city TEXT, area TEXT, status TEXT DEFAULT 'new', total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0, accepts_marketing INTEGER DEFAULT 0,
      marketing_opt_in INTEGER DEFAULT 0, last_order_at TEXT, is_blocked INTEGER DEFAULT 0,
      notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS discount_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL,
      value REAL NOT NULL, is_active INTEGER DEFAULT 1, minimum_order_amount REAL DEFAULT 0,
      usage_limit INTEGER, used_count INTEGER DEFAULT 0, starts_at TEXT, expires_at TEXT,
      notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS abandoned_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, checkout_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open', customer_name TEXT DEFAULT '',
      customer_email TEXT DEFAULT '', customer_phone TEXT DEFAULT '',
      contact_value TEXT DEFAULT '', contact_type TEXT DEFAULT '',
      first_name TEXT DEFAULT '', last_name TEXT DEFAULT '',
      address1 TEXT DEFAULT '', address2 TEXT DEFAULT '', city TEXT DEFAULT '',
      governorate TEXT DEFAULT '', country TEXT DEFAULT 'Kuwait', postal_code TEXT DEFAULT '',
      notes TEXT DEFAULT '', discount_code TEXT DEFAULT '', discount_amount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0, shipping_cost REAL DEFAULT 0,
      total REAL DEFAULT 0, currency TEXT DEFAULT 'KWD', cart_items TEXT DEFAULT '[]',
      cart_quantity INTEGER DEFAULT 0, item_count INTEGER DEFAULT 0,
      recovered_order_id TEXT DEFAULT '', recovered_order_number TEXT DEFAULT '',
      last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS theme_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE IF NOT EXISTS theme_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        settings_json TEXT NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_id) REFERENCES theme_pages(id) ON DELETE CASCADE
      );
CREATE TABLE IF NOT EXISTS theme_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE IF NOT EXISTS redirects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_path TEXT NOT NULL UNIQUE,
          destination_path TEXT NOT NULL,
          status_code INTEGER DEFAULT 301,
          is_active INTEGER DEFAULT 1,
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE IF NOT EXISTS visitor_heartbeats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL UNIQUE,
      page TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      source TEXT DEFAULT 'storefront',
      first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
