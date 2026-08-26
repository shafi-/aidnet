-- ====================================================================
-- INVITE EMAIL BINDING
-- ====================================================================
-- accept_invite previously redeemed membership for ANY authenticated
-- user holding the token, regardless of which address the invite was
-- issued to. invites.email is NOT NULL and is the intended owner of
-- the membership; enforcement belongs here at the authorization
-- boundary (SECURITY DEFINER), not in client code.
--
-- Also takes a row lock (FOR UPDATE) so two concurrent redemptions
-- cannot both pass the unaccepted check.

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite invites;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW()
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF v_user_email IS NULL OR lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'Invite issued for a different email';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Keep the grant surface explicit: authenticated redeemers only.
REVOKE EXECUTE ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;
