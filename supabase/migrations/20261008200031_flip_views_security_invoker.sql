-- ====================================================================
-- Flip the five API-schema views to security_invoker
-- ====================================================================
-- 20261008180847 revoked every API-role grant on these views, closing the
-- read/write bypass that the blanket table grants had opened. That closed
-- ACCESS, but each view still executes with its OWNER's privileges by
-- construction — database lint 0010 (security_definer_view) keeps firing
-- and the weakness stays structural: any future grant regression re-leaks
-- them, which is exactly how 20261007141523 leaked them. security_invoker
-- moves the views inside the deny-all RLS boundary instead of on top of it.
--
-- Safe because their only consumers are SECURITY DEFINER functions running
-- as the tables' owner (the owner bypasses RLS and no FORCE RLS exists in
-- this stream), and the one SECURITY INVOKER consumer — update_organization,
-- which returned through organization_view — was flipped to SECURITY
-- DEFINER in 20261008180847. The client never reads views directly; all
-- access goes through RPC functions, so no API behavior changes.

ALTER VIEW donate.profile_view             SET (security_invoker = TRUE);
ALTER VIEW donate.organization_view        SET (security_invoker = TRUE);
ALTER VIEW donate.organization_detail_view SET (security_invoker = TRUE);
ALTER VIEW donate.member_view              SET (security_invoker = TRUE);
ALTER VIEW donate.role_view                SET (security_invoker = TRUE);
