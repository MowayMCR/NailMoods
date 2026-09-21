-- Emergency application rollback: deploy previous Sites version first.
-- Then disable the added public APIs; preserve private messages and relationships.
revoke execute on function public.nm_social(text,jsonb) from authenticated;
revoke execute on function public.nm_discover(text,jsonb) from authenticated;
-- Restore prior po-private-sharing.sql only after deciding whether the old
-- unconnected sharing behavior is desired. Never delete users or their content.
