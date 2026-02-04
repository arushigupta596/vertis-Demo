import { NextResponse } from "next/server";

/**
 * GET /api/config-check
 * Check if required environment variables are configured
 */
export async function GET() {
  const hasSupabase =
    !!process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("your-password") &&
    !process.env.DATABASE_URL.includes("db.xyz.supabase.co") &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon") &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-service");

  const hasOpenRouter =
    !!process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_API_KEY.length > 0;

  return NextResponse.json({
    hasSupabase,
    hasOpenRouter,
    configured: hasSupabase && hasOpenRouter,
  });
}
