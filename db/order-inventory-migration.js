'use strict';

// Explicit migration only; never imported by production startup.
async function migrateOrderInventory(db) {
  const columns = await db.all('PRAGMA table_info(orders)');
  for (const [name, definition] of Object.entries({ inventory_managed: 'INTEGER NOT NULL DEFAULT 0',
    checkout_key: 'TEXT', checkout_fingerprint: 'TEXT' })) {
    if (!columns.some(column => column.name === name)) await db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
  }
  const statements = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_key ON orders(checkout_key)',
    `CREATE TABLE IF NOT EXISTS order_checkout_tombstones (
      checkout_key TEXT PRIMARY KEY, checkout_fingerprint TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS order_inventory (
      order_id INTEGER NOT NULL, product_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
      state TEXT NOT NULL CHECK(state IN ('reserved','fulfilled','released','restocked')),
      PRIMARY KEY(order_id,product_id), FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE)`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_insert_guard BEFORE INSERT ON order_items
      WHEN (SELECT inventory_managed FROM orders WHERE id=NEW.order_id)=1 BEGIN
      SELECT CASE WHEN NEW.quantity<=0 OR NEW.quantity!=CAST(NEW.quantity AS INTEGER)
        OR NOT EXISTS (SELECT 1 FROM products WHERE id=NEW.product_id AND status='active'
          AND COALESCE(inventory_enabled,1)=1 AND COALESCE(inventory_blocked,0)=0
          AND COALESCE(on_hand,0)-COALESCE(committed,0)-COALESCE(unavailable,0)>=NEW.quantity)
        THEN RAISE(ABORT,'ORDER_STOCK_UNAVAILABLE') END;
      SELECT CASE WHEN (SELECT status FROM orders WHERE id=NEW.order_id) NOT IN ('pending','processing')
        THEN RAISE(ABORT,'ORDER_INVENTORY_TERMINAL') END;
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_reserve AFTER INSERT ON order_items
      WHEN (SELECT inventory_managed FROM orders WHERE id=NEW.order_id)=1 BEGIN
      INSERT INTO order_inventory(order_id,product_id,quantity,state) VALUES(NEW.order_id,NEW.product_id,NEW.quantity,'reserved');
      UPDATE products SET committed=COALESCE(committed,0)+NEW.quantity,
        stock=MAX(0,COALESCE(on_hand,0)-COALESCE(committed,0)-COALESCE(unavailable,0)-NEW.quantity),
        updated_at=CURRENT_TIMESTAMP WHERE id=NEW.product_id;
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_transition_guard BEFORE UPDATE OF state ON order_inventory
      WHEN OLD.state!=NEW.state BEGIN
      SELECT CASE WHEN NOT ((OLD.state='reserved' AND NEW.state IN ('fulfilled','released')) OR
        (OLD.state='fulfilled' AND NEW.state='restocked')) THEN RAISE(ABORT,'ORDER_INVENTORY_TERMINAL') END;
      SELECT CASE WHEN OLD.state='reserved' AND NOT EXISTS (SELECT 1 FROM products WHERE id=OLD.product_id
        AND COALESCE(committed,0)>=OLD.quantity AND (NEW.state!='fulfilled' OR COALESCE(on_hand,0)>=OLD.quantity))
        THEN RAISE(ABORT,'ORDER_INVENTORY_INCONSISTENT') END;
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_transition AFTER UPDATE OF state ON order_inventory
      WHEN OLD.state!=NEW.state BEGIN
      UPDATE products SET
        committed=COALESCE(committed,0)-CASE WHEN OLD.state='reserved' THEN OLD.quantity ELSE 0 END,
        on_hand=COALESCE(on_hand,0)+CASE WHEN NEW.state='fulfilled' THEN -OLD.quantity WHEN NEW.state='restocked' THEN OLD.quantity ELSE 0 END,
        stock=MAX(0,COALESCE(on_hand,0)-COALESCE(committed,0)-COALESCE(unavailable,0)
          +CASE WHEN OLD.state='reserved' THEN OLD.quantity ELSE 0 END
          +CASE WHEN NEW.state='fulfilled' THEN -OLD.quantity WHEN NEW.state='restocked' THEN OLD.quantity ELSE 0 END),
        updated_at=CURRENT_TIMESTAMP WHERE id=OLD.product_id;
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_status_guard BEFORE UPDATE OF status ON orders
      WHEN OLD.inventory_managed=1 AND OLD.status!=NEW.status AND NEW.status IN ('pending','processing','shipped','completed')
      BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM order_inventory WHERE order_id=OLD.id AND state IN ('released','restocked'))
        OR (OLD.status='cancelled' AND NEW.status IN ('shipped','completed'))
        THEN RAISE(ABORT,'ORDER_INVENTORY_TERMINAL') END; END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_status AFTER UPDATE OF status ON orders
      WHEN NEW.inventory_managed=1 BEGIN
      UPDATE order_inventory SET state=CASE WHEN NEW.status='cancelled' THEN 'released' ELSE 'fulfilled' END
        WHERE order_id=NEW.id AND state='reserved' AND NEW.status IN ('cancelled','shipped','completed');
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_item_delete BEFORE DELETE ON order_items
      WHEN (SELECT inventory_managed FROM orders WHERE id=OLD.order_id)=1 BEGIN
      SELECT CASE WHEN EXISTS (SELECT 1 FROM order_inventory WHERE order_id=OLD.order_id AND product_id=OLD.product_id
        AND state='fulfilled') THEN RAISE(ABORT,'ORDER_INVENTORY_TERMINAL') END;
      UPDATE order_inventory SET state='released' WHERE order_id=OLD.order_id AND product_id=OLD.product_id AND state='reserved';
      DELETE FROM order_inventory WHERE order_id=OLD.order_id AND product_id=OLD.product_id;
      END`,
    `CREATE TRIGGER IF NOT EXISTS order_inventory_order_delete BEFORE DELETE ON orders
      WHEN OLD.inventory_managed=1 BEGIN
      INSERT OR IGNORE INTO order_checkout_tombstones(checkout_key,checkout_fingerprint)
        SELECT OLD.checkout_key,OLD.checkout_fingerprint WHERE OLD.checkout_key IS NOT NULL;
      UPDATE order_inventory SET state='released' WHERE order_id=OLD.id AND state='reserved';
      DELETE FROM order_inventory WHERE order_id=OLD.id;
      END`
  ];
  for (const sql of statements) await db.run(sql);
}
module.exports = { migrateOrderInventory };
