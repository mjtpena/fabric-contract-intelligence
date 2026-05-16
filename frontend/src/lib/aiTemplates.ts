export const aiDescriptionTemplates = [
  {
    id: 'customer-360',
    label: 'Customer 360',
    prompt: 'A daily customer profile dataset with PII (email, phone), enriched with lifetime value and segment tags. Refreshed at 02:00 UTC. Owner: marketing-data team.',
    preview: 'Typically captures identifiers, PII classification, refresh SLA, owner stewardship, and uniqueness on customer_id.',
    yaml: sampleYaml('Customer 360', 'customer_id', 'email'),
  },
  {
    id: 'transaction-ledger',
    label: 'Transaction Ledger',
    prompt: 'An append-only payment transaction ledger with authorization status, amount, currency, merchant, and event time. Used by finance and fraud teams.',
    preview: 'Usually enforces amount ranges, currency enum, immutable transaction IDs, and freshness for posted events.',
    yaml: sampleYaml('Transaction Ledger', 'transaction_id', 'amount'),
  },
  {
    id: 'inventory',
    label: 'Inventory',
    prompt: 'A near-real-time inventory snapshot by SKU, warehouse, on-hand quantity, reserved quantity, and reorder threshold. Refreshed every 30 minutes.',
    preview: 'Typically models non-negative quantities, SKU uniqueness by location, and freshness SLA.',
    yaml: sampleYaml('Inventory', 'sku', 'on_hand_quantity'),
  },
  {
    id: 'clickstream',
    label: 'Clickstream',
    prompt: 'A web clickstream events table with anonymous visitor ID, session ID, URL, referrer, campaign tags, and event timestamp.',
    preview: 'Common rules cover event timestamp requiredness, URL format, campaign enum, and late-arrival tolerance.',
    yaml: sampleYaml('Clickstream', 'event_id', 'event_timestamp'),
  },
  {
    id: 'event-stream',
    label: 'Event Stream',
    prompt: 'A streaming operational events dataset with event type, source system, correlation ID, severity, payload hash, and ingestion timestamp.',
    preview: 'Contracts often define event type enums, correlation ID uniqueness, and max ingestion lag.',
    yaml: sampleYaml('Event Stream', 'event_id', 'severity'),
  },
  {
    id: 'order-pipeline',
    label: 'Order Pipeline',
    prompt: 'A retail order pipeline table with order ID, customer ID, fulfillment status, subtotal, tax, shipping country, and updated timestamp.',
    preview: 'Usually validates order status enums, amount ranges, customer foreign keys, and daily completeness.',
    yaml: sampleYaml('Order Pipeline', 'order_id', 'fulfillment_status'),
  },
  {
    id: 'iot-telemetry',
    label: 'IoT Telemetry',
    prompt: 'An IoT telemetry table with device ID, site ID, temperature, vibration, battery percentage, firmware version, and sample timestamp.',
    preview: 'Often captures numeric ranges, device ID requiredness, firmware format, and high-frequency freshness.',
    yaml: sampleYaml('IoT Telemetry', 'device_id', 'sample_timestamp'),
  },
  {
    id: 'financial-statements',
    label: 'Financial Statements',
    prompt: 'A monthly financial statements dataset with account, cost center, period, actual amount, budget amount, currency, and consolidation status.',
    preview: 'Common rules include period format, currency enum, account hierarchy foreign keys, and reconciliation checks.',
    yaml: sampleYaml('Financial Statements', 'account_id', 'period'),
  },
] as const;

function sampleYaml(name: string, key: string, field: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `apiVersion: v3.1.0\nkind: DataContract\nid: urn:orqentis:template:${slug}:v1\nname: ${name}\nversion: 1.0.0\nstatus: draft\nservers:\n  - server: fabric-default\n    type: azure\n    location: abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/${slug}\n    format: delta\nschema:\n  - name: ${slug}\n    physicalType: table\n    properties:\n      - name: ${key}\n        logicalType: string\n        physicalType: STRING\n        required: true\n        unique: true\n      - name: ${field}\n        logicalType: string\n        physicalType: STRING\n        required: true\n`;
}
