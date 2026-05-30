-- =============================================================================
-- Migrations required by the auth/correctness fixes on branch `fix/bug-fix`.
-- Run these against the Supabase Postgres in roughly this order.
-- Each block is idempotent / safe to re-run.
-- =============================================================================

-- 1. Ticket.customerId  -----------------------------------------------------
-- The code now stamps customerId on every new ticket. Existing rows are
-- "orphaned" (NULL). Customer-side actions (cancel, saveSubscription) reject
-- NULL customerId rows as untrusted, which effectively retires them.

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "customerId" uuid REFERENCES "User"(id);

-- Optional: clear any still-active orphaned tickets so they don't sit forever.
-- UPDATE "Ticket" SET status = 'NOSHOW'
--   WHERE "customerId" IS NULL AND status IN ('PENDING', 'NOTIFIED', 'SERVING');

-- Once verified that all live rows have customerId set, enforce it:
-- ALTER TABLE "Ticket" ALTER COLUMN "customerId" SET NOT NULL;


-- 2. Ticket.noshowAt  -------------------------------------------------------
-- updateQueueTicketStatus / cancelQueueTicket now write this timestamp on
-- NOSHOW transitions. Dashboard `noshowToday` stat depends on it.

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "noshowAt" timestamptz;


-- 3. Unique (shopId, ticketNo)  --------------------------------------------
-- Backstop for the read-then-insert race in createQueueTicket. The retry
-- loop in code only works if Postgres surfaces 23505 on collision.

CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_shopId_ticketNo_unique"
  ON "Ticket" ("shopId", "ticketNo");


-- 4. Drop User.password  ---------------------------------------------------
-- Credentials are owned by Supabase Auth. The new code no longer writes
-- this column. Run AFTER deploying so no live code reads/writes it.

-- ALTER TABLE "User" DROP COLUMN IF EXISTS "password";


-- 5. Shop.password — bcrypt re-hash  ---------------------------------------
-- loginManager now lazy-rehashes plaintext rows on successful login. After
-- a few weeks (once all active shops have logged in), drop the legacy
-- branch in backend/actions.ts and verify no plaintext rows remain:
--
-- SELECT id, name FROM "Shop" WHERE "password" NOT LIKE '$2_$%';
--
-- Any remaining plaintext rows should be force-reset by an admin.
