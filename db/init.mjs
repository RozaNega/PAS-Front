import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'pas.db');

let db = null;

export function getDb() {
  if (db) return db;
  const isNew = !existsSync(DB_PATH);
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (isNew) {
    console.log('Creating database schema...');
    createSchema();
    console.log('Seeding data...');
    seedData();
  } else {
    console.log('Database found at', DB_PATH);
  }

  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      region TEXT
    );

    CREATE TABLE IF NOT EXISTS property_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tag_number TEXT,
      serial_number TEXT,
      property_type_id TEXT,
      property_category_id TEXT,
      location_id TEXT,
      unit_price REAL NOT NULL,
      total_value REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      purchase_date TEXT NOT NULL,
      current_value REAL NOT NULL,
      description TEXT,
      purchase_price REAL NOT NULL,
      safety_box_id TEXT,
      shelf_number INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_type_id) REFERENCES property_types(id),
      FOREIGN KEY (property_category_id) REFERENCES property_categories(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS depreciation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      recorded_date TEXT NOT NULL,
      book_value REAL NOT NULL,
      depreciation_amount REAL NOT NULL,
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(property_category_id);
    CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_id);
    CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
  `);
}

function seedData() {
  const insertCategory = db.prepare('INSERT OR IGNORE INTO property_categories (id, name, description) VALUES (?, ?, ?)');
  const insertLocation = db.prepare('INSERT OR IGNORE INTO locations (id, name, city, region) VALUES (?, ?, ?, ?)');
  const insertType = db.prepare('INSERT OR IGNORE INTO property_types (id, name) VALUES (?, ?)');
  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (id, name, tag_number, serial_number, property_type_id, property_category_id, location_id, unit_price, total_value, quantity, purchase_date, current_value, description, purchase_price, safety_box_id, shelf_number, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    ['cat-infrastructure', 'Infrastructure', 'Buildings, warehouses, and permanent structures'],
    ['cat-it', 'IT Equipment', 'Computers, servers, and peripherals'],
    ['cat-security', 'Security Equipment', 'Safety and surveillance equipment'],
    ['cat-vehicles', 'Vehicles', 'Fleet vehicles and transportation'],
    ['cat-furniture', 'Furniture', 'Office furniture and fixtures'],
    ['cat-facility', 'Facility Equipment', 'HVAC, generators, and building systems'],
  ];

  const locations = [
    ['loc-addis', 'Addis Ababa HQ', 'Addis Ababa', 'Addis Ababa'],
    ['loc-bole', 'Bole District', 'Addis Ababa', 'Addis Ababa'],
    ['loc-nifas', 'Nifas Silk District', 'Addis Ababa', 'Addis Ababa'],
    ['loc-kirkos', 'Kirkos District', 'Addis Ababa', 'Addis Ababa'],
    ['loc-addis-ketema', 'Addis Ketema District', 'Addis Ababa', 'Addis Ababa'],
  ];

  const types = [
    ['pt-building', 'Building'],
    ['pt-warehouse', 'Warehouse'],
    ['pt-electronics', 'Electronics'],
    ['pt-vehicle', 'Vehicle'],
    ['pt-furniture', 'Furniture'],
    ['pt-hvac', 'HVAC'],
    ['pt-facility', 'Facility'],
    ['pt-safety', 'Safety'],
    ['pt-safety-box', 'Safety Box'],
  ];

  const transaction = db.transaction(() => {
    for (const c of categories) insertCategory.run(...c);
    for (const l of locations) insertLocation.run(...l);
    for (const t of types) insertType.run(...t);

    const properties = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'properties.json'), 'utf8'));
    for (const p of properties) {
      insertProperty.run(
        p.id, p.name, p.tagNumber || null, p.serialNumber || null,
        p.propertyTypeId || null, p.propertyCategoryId || null, p.locationId || null,
        p.unitPrice, p.totalValue, p.quantity || 1,
        p.purchaseDate, p.currentValue, p.description || null,
        p.purchasePrice, p.safetyBoxId || null, p.shelfNumber || null,
        p.isActive ? 1 : 0
      );
    }

    // Seed depreciation history for trend data
    const insertDep = db.prepare('INSERT INTO depreciation_history (property_id, recorded_date, book_value, depreciation_amount) VALUES (?, ?, ?, ?)');
    const allProps = db.prepare('SELECT id, total_value, current_value, purchase_date FROM properties').all();
    for (const prop of allProps) {
      const purchaseDate = new Date(prop.purchase_date);
      const totalMonths = Math.max(1, Math.floor((Date.now() - purchaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const totalDep = prop.total_value - prop.current_value;
      for (let m = 1; m <= Math.min(totalMonths, 24); m++) {
        const monthDate = new Date(purchaseDate);
        monthDate.setMonth(monthDate.getMonth() + m);
        const fraction = m / totalMonths;
        const depSoFar = Math.round(totalDep * fraction);
        const bookAtMonth = prop.total_value - depSoFar;
        if (bookAtMonth >= 0 && depSoFar >= 0) {
          insertDep.run(prop.id, monthDate.toISOString().split('T')[0], bookAtMonth, depSoFar);
        }
      }
    }
  });

  transaction();
  console.log('Database seeded with', db.prepare('SELECT COUNT(*) as count FROM properties').get().count, 'properties');
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
