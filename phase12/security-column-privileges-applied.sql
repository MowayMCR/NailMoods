-- Applied remotely: restrict_conversation_identity_and_pro_verification (2026-09-18).
revoke update on table public.conversation_members from authenticated;
revoke update (conversation_id, user_id, created_at, last_read_at) on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
revoke insert on table public.pro_profiles from authenticated;
revoke insert (id, user_id, workspace_id, display_name, bio, avatar_url, city, social_url, is_public, is_verified, styles, created_at, updated_at) on public.pro_profiles from authenticated;
grant insert (id, user_id, workspace_id, display_name, bio, avatar_url, city, social_url, is_public, styles) on public.pro_profiles to authenticated;
