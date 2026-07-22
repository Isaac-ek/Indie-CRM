import test from "node:test";
import assert from "node:assert/strict";
import { getTenantScopedPrisma } from "@/lib/prisma";

test("requires a valid non-empty tenantId for scoped database queries", () => {
  assert.throws(
    () => getTenantScopedPrisma(""),
    /Tenant ID is required for tenant-scoped database operations/
  );
});
