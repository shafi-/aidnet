-- Retire the Todos placeholder feature.
--
-- The org-dashboard "Todos" tab shipped as a scaffold example to prove out
-- the repository -> service -> RPC pattern; it never became a product
-- feature. This removes its RPC surface and its table so production never
-- exposes it. `can_perform`/`has_feature` stay generic — only the seeded
-- 'todos' feature keys disappear (seed change alongside this migration).
--
-- Function drops precede the table drop because update_todo is
-- `RETURNS SETOF todos`.

DROP FUNCTION IF EXISTS donate.create_todo(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS donate.get_todos(UUID);
DROP FUNCTION IF EXISTS donate.update_todo(UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS donate.delete_todo(UUID);

-- CASCADE takes the RLS policies and the updated_at trigger with it.
DROP TABLE IF EXISTS donate.todos CASCADE;

-- Existing plans may still list the retired feature key; strip it so the
-- billing UI never renders a dead chip. The seeded role_permissions rows for
-- todos:* go too — can_perform's matrix keeps only live capabilities.
UPDATE donate.subscription_plans
SET features = features - 'todos'
WHERE features ? 'todos';

DELETE FROM donate.role_permissions WHERE permission LIKE 'todos:%';
