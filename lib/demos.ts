export type DemoKey = "auth" | "payments" | "refactor" | "custom";

export const DEMOS: Record<DemoKey, { number: string; name: string; subtitle: string; title: string; diff: string }> = {
  auth: {
    number: "01", name: "Auth shortcut", subtitle: "3 risk signals found", title: "Admin access hotfix",
    diff: `diff --git a/src/api/admin.ts b/src/api/admin.ts
index 4c9ed31..bc777ea 100644
--- a/src/api/admin.ts
+++ b/src/api/admin.ts
@@ -14,11 +14,15 @@ export async function updateMember(req: Request) {
-  const session = await requireAdmin(req);
-  const member = await members.get(req.params.id);
+  const token = req.headers.get("authorization");
+  const session = jwt.verify(token);
+  const role = req.body.role || session.role;
 
-  await members.update(member.id, safeFields(req.body));
+  await members.update(req.params.id, {
+    ...req.body,
+    role,
+  });
 
   return Response.json({ ok: true });
 }
diff --git a/src/api/admin.test.ts b/src/api/admin.test.ts
index 603ac1a..175dc18 100644
--- a/src/api/admin.test.ts
+++ b/src/api/admin.test.ts
@@ -42,7 +42,7 @@ describe("admin member updates", () => {
-  it("rejects member role escalation", async () => {
+  it.skip("rejects member role escalation", async () => {
     const response = await updateAs("member", { role: "admin" });
     expect(response.status).toBe(403);
   });`,
  },
  payments: {
    number: "02", name: "Payment retry", subtitle: "2 failure paths exposed", title: "Checkout retry handler",
    diff: `diff --git a/src/checkout/charge.ts b/src/checkout/charge.ts
index 12e6a10..932cc4a 100644
--- a/src/checkout/charge.ts
+++ b/src/checkout/charge.ts
@@ -21,8 +21,14 @@ export async function completeOrder(order: Order) {
-  return ledger.commit(order.id, order.total);
+  try {
+    const payment = await stripe.charge(order.total, order.cardToken);
+    await ledger.commit(order.id, payment.id);
+    return { ok: true, payment };
+  } catch (error) {
+    console.warn("checkout retry scheduled", error);
+    return { ok: true, retry: true };
+  }
 }`,
  },
  refactor: {
    number: "03", name: "Safe refactor", subtitle: "ready to verify", title: "Structured logger cleanup",
    diff: `diff --git a/src/infra/logger.ts b/src/infra/logger.ts
index 156ac20..f8c92ee 100644
--- a/src/infra/logger.ts
+++ b/src/infra/logger.ts
@@ -4,8 +4,11 @@ export function logEvent(name: string, payload: EventPayload) {
-  console.log(name, JSON.stringify(payload));
+  const event = {
+    name,
+    timestamp: new Date().toISOString(),
+    payload: redactPrivateFields(payload),
+  };
+  process.stdout.write(JSON.stringify(event) + "\\n");
 }
diff --git a/src/infra/logger.test.ts b/src/infra/logger.test.ts
index 1c3da70..323b221 100644
--- a/src/infra/logger.test.ts
+++ b/src/infra/logger.test.ts
@@ -18,3 +18,8 @@ test("redacts user email", () => {
   expect(output).not.toContain("ava@example.com");
 });
+
+test("emits parseable JSON", () => {
+  logEvent("checkout.opened", { cartId: "c_12" });
+  expect(() => JSON.parse(output)).not.toThrow();
+});`,
  },
  custom: { number: "04", name: "Custom", subtitle: "local analysis", title: "Custom patch review", diff: "" },
};
