import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MAX_ADMIN_ACCOUNTS } from "@/lib/auth/admin-slots";
import {
  assertAnonKey,
  assertServiceRoleKey,
  getPublicSupabaseEnv,
  getServiceRoleKey,
  inspectJwtKey,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/env";
import { hasServiceRoleKey } from "@/lib/supabase/service";

async function probe(url: string, key: string) {
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { count, error } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return {
    ok: !error,
    count: error ? null : (count ?? 0),
    error: error?.message || null,
    errorCode: (error as { code?: string } | null)?.code || null,
  };
}

/** Non-secret health check for registration env on Netlify. */
export async function GET() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const serviceKey = getServiceRoleKey();
  const projectRef = supabaseProjectRefFromUrl(url);
  const anonMeta = inspectJwtKey(anonKey);
  const serviceMeta = inspectJwtKey(serviceKey);

  let anonProbe = null as Awaited<ReturnType<typeof probe>> | null;
  let serviceProbe = null as Awaited<ReturnType<typeof probe>> | null;
  let adminListOk: boolean | null = null;
  let adminListError: string | null = null;

  if (url && anonKey) {
    try {
      anonProbe = await probe(url, anonKey);
    } catch (e) {
      anonProbe = {
        ok: false,
        count: null,
        error: e instanceof Error ? e.message : "unknown",
        errorCode: null,
      };
    }
  }

  if (url && serviceKey) {
    try {
      serviceProbe = await probe(url, serviceKey);
      const service = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await service.auth.admin.listUsers({ page: 1, perPage: 1 });
      adminListOk = !error;
      adminListError = error?.message || null;
    } catch (e) {
      serviceProbe = {
        ok: false,
        count: null,
        error: e instanceof Error ? e.message : "unknown",
        errorCode: null,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: url
      ? url.replace(/^https?:\/\//, "").split("/")[0]
      : null,
    projectRef,
    maxAdminAccounts: MAX_ADMIN_ACCOUNTS,
    buildId: process.env.MEDIA_OFFICE_BUILD_ID || null,
    anon: {
      present: anonMeta.present,
      jwt: anonMeta.jwt,
      len: anonMeta.len,
      role: anonMeta.role,
      refMatchesHost: Boolean(
        anonMeta.ref && projectRef && anonMeta.ref === projectRef,
      ),
      roleIsAnon: anonMeta.role === "anon",
      assertError: url && anonKey ? assertAnonKey(url, anonKey) : "missing",
      probe: anonProbe,
    },
    service: {
      present: serviceMeta.present,
      jwt: serviceMeta.jwt,
      len: serviceMeta.len,
      role: serviceMeta.role,
      refMatchesHost: Boolean(
        serviceMeta.ref && projectRef && serviceMeta.ref === projectRef,
      ),
      roleIsService: serviceMeta.role === "service_role",
      assertError:
        url && serviceKey ? assertServiceRoleKey(url, serviceKey) : "missing",
      hasServiceRole: hasServiceRoleKey(),
      probe: serviceProbe,
      adminListOk,
      adminListError,
    },
    keysSwapped:
      anonMeta.role === "service_role" && serviceMeta.role === "anon",
  });
}
