-- Client roles must not inspect server-side transport headers or trigger arbitrary HTTP requests.
-- Cron and SECURITY DEFINER service wrappers retain their owner privileges.
begin;
revoke all on net.http_request_queue,net._http_response from public,anon,authenticated;
revoke execute on function net.http_post(text,jsonb,jsonb,jsonb,integer),net.http_get(text,jsonb,jsonb,integer),net.http_delete(text,jsonb,jsonb,integer,jsonb) from public,anon,authenticated;
commit;
