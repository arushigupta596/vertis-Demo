/**
 * Create database tables using Supabase Management API
 * This uses the service role key which we know works
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

const SQL_FILE = path.join(process.cwd(), "database-setup.sql");
const sql = fs.readFileSync(SQL_FILE, "utf-8");

console.log("🔧 Creating database tables via Supabase API...\n");
console.log("Project:", projectRef);
console.log("SQL file:", SQL_FILE);
console.log("");

async function createTables() {
  // Use Supabase Management API to execute SQL
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        query: sql,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ API request failed:", response.status, response.statusText);
    console.error("Error:", error);
    console.log("\n⚠️  Please use the Supabase SQL Editor instead:");
    console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    process.exit(1);
  }

  const result = await response.json();
  console.log("✅ Tables created successfully!");
  console.log("Result:", JSON.stringify(result, null, 2));
}

createTables().catch((err) => {
  console.error("❌ Failed to create tables:", err.message);
  console.log("\n⚠️  Please use the Supabase SQL Editor instead:");
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log("\nCopy and paste the SQL from: database-setup.sql");
  process.exit(1);
});
