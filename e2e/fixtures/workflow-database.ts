// Workflow tests must never connect to a deployed or shared CRM database.
export function workflowDatabaseUrl() {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) throw new Error("Set E2E_DATABASE_URL to a dedicated local indie_crm_workflow_* database.");
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !/^\/indie_crm_workflow(?:_|$)/.test(url.pathname)) {
    throw new Error("Workflow tests require a local database named indie_crm_workflow_*; refusing this connection.");
  }
  return value;
}
