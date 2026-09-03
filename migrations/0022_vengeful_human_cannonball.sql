ALTER TABLE "corpus" DROP CONSTRAINT IF EXISTS "corpus_owner_check";--> statement-breakpoint
DO $$
DECLARE
  u record;
  base text;
  candidate text;
  new_team_id uuid;
  suffix integer;
BEGIN
  FOR u IN SELECT id, username, name FROM "user" ORDER BY created_at LOOP
    IF EXISTS (
      SELECT 1 FROM team_membership tm JOIN team t ON t.id = tm.team_id
      WHERE tm.user_id = u.id AND t.kind = 'personal'
    ) THEN
      CONTINUE;
    END IF;
    base := COALESCE(
      (SELECT cleaned FROM (SELECT replace(lower(u.username), '_', '-') AS cleaned) s
       WHERE cleaned ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])?$'),
      'personal-' || left(u.id, 8)
    );
    new_team_id := gen_random_uuid();
    suffix := 0;
    LOOP
      candidate := CASE
        WHEN suffix = 0 THEN base
        WHEN suffix = 1 THEN base || '-personal'
        ELSE base || '-personal-' || suffix
      END;
      IF NOT EXISTS (SELECT 1 FROM team WHERE slug = candidate) THEN
        INSERT INTO team (id, name, slug, kind, created_by_user_id, created_at, updated_at)
        VALUES (new_team_id, left(COALESCE(NULLIF(u.name, ''), NULLIF(u.username, ''), 'Personal'), 100), candidate, 'personal', u.id, now(), now());
        INSERT INTO team_membership (team_id, user_id, role, created_at, updated_at)
        VALUES (new_team_id, u.id, 'owner', now(), now());
        INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, metadata, created_at)
        VALUES (gen_random_uuid(), u.id, 'team.personal_created', 'team', new_team_id::text, '{}'::jsonb, now());
        EXIT;
      END IF;
      suffix := suffix + 1;
      IF suffix > 9 THEN
        RAISE EXCEPTION 'Unable to allocate a personal team slug for user %', u.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;--> statement-breakpoint
UPDATE corpus c
SET owner_team_id = tm.team_id, updated_at = now()
FROM team_membership tm
JOIN team t ON t.id = tm.team_id AND t.kind = 'personal'
WHERE c.owner_user_id = tm.user_id AND tm.role = 'owner' AND c.owner_type = 'user';--> statement-breakpoint
UPDATE corpus c
SET owner_team_id = admin_team.team_id, updated_at = now()
FROM (
  SELECT tm.team_id
  FROM "user" u
  JOIN team_membership tm ON tm.user_id = u.id AND tm.role = 'owner'
  JOIN team t ON t.id = tm.team_id AND t.kind = 'personal'
  WHERE u.role = 'admin' AND u.status = 'active'
  ORDER BY u.created_at
  LIMIT 1
) AS admin_team
WHERE c.owner_type = 'bootstrap' AND c.owner_team_id IS NULL;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM corpus WHERE owner_team_id IS NULL) THEN
    RAISE EXCEPTION 'Corpora remain without an owner team after backfill.';
  END IF;
END $$;--> statement-breakpoint
INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, metadata, created_at)
SELECT gen_random_uuid(), prev.owner_user_id, 'corpus.owner_migrated', 'corpus', c.id,
  jsonb_build_object('previousOwnerType', prev.owner_type, 'previousOwnerUserId', prev.owner_user_id, 'ownerTeamId', c.owner_team_id),
  now()
FROM corpus c
JOIN LATERAL (
  SELECT c.owner_type AS owner_type, c.owner_user_id AS owner_user_id
) prev ON true
WHERE prev.owner_type IN ('user', 'bootstrap') AND c.owner_team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log done
    WHERE done.action = 'corpus.owner_migrated' AND done.target_id = c.id::text
  );--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "corpus_ownership_transfer" CASCADE;--> statement-breakpoint
ALTER TABLE "corpus" DROP CONSTRAINT IF EXISTS "corpus_owner_check";--> statement-breakpoint
ALTER TABLE "corpus" DROP CONSTRAINT "corpus_owner_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "corpus_owner_user_idx";--> statement-breakpoint
ALTER TABLE "corpus" ALTER COLUMN "owner_team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "corpus" DROP COLUMN "owner_type";--> statement-breakpoint
ALTER TABLE "corpus" DROP COLUMN "owner_user_id";
