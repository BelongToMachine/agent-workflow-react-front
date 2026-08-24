-- Employee members can work with chats and documents, but never knowledge data.
ALTER TABLE "WorkspaceMember"
  DROP CONSTRAINT IF EXISTS "WorkspaceMember_role_check";--> statement-breakpoint
ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_role_check"
  CHECK ("role" IN ('owner', 'admin', 'editor', 'employee', 'viewer'));
