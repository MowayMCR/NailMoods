begin;
-- Defense in depth where the execution role owns pg_net's queue. On managed
-- instances its owner may retain a PUBLIC grant; the following nonce migration
-- ensures no reusable scheduler credential is placed in that queue.
revoke select on net.http_request_queue from public,anon,authenticated;
commit;
