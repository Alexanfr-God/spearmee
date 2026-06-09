-- Trigger function: never called directly, revoke all execute
REVOKE ALL ON FUNCTION public.handle_swipe_match() FROM PUBLIC, anon, authenticated;

-- Match-membership check used by RLS: keep callable only by authenticated (needed for policies)
REVOKE ALL ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO authenticated;