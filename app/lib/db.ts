import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "";
const isInternal = dbUrl.includes(".railway.internal");

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isInternal ? false : dbUrl.includes("proxy.rlwy.net") ? { rejectUnauthorized: false } : false,
  max: 10,
});

export default pool;
