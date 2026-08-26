-- ====================================================================
-- INVITE VALIDATION WITHOUT EMAIL DISCLOSURE
-- ====================================================================
-- The old validate_invite(token) returned the invited email (and role)
-- to any anon caller holding the token. Validation now requires the
-- claimant's email as input and reveals only the organization name on
-- an exact match; anything else returns NULL with no state distinction
-- between wrong-email / expired / already-used / unknown-token.
--
-- Signature changed: CREATE OR REPLACE would leave the leaky 1-arg
-- overload callable, so it is dropped explicitly first.

DROP FUNCTION IF EXISTS public.validate_invite(TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite(
  p_token TEXT,
  p_email TEXT
)
RETURNS TEXT -- org name when the pending invite is bound to p_email, else NULL
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.name
  FROM invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND lower(i.email) = lower(p_email)
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
$$;

-- Pre-auth lookup for the /invite page stays anonymous-capable.
REVOKE EXECUTE ON FUNCTION public.validate_invite(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite(TEXT, TEXT) TO anon, authenticated;
