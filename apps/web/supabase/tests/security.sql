begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.profiles values ('00000000-0000-0000-0000-000000000001','UTC');
select public.apply_habit('{"id":"10000000-0000-0000-0000-000000000001","user_id":"00000000-0000-0000-0000-000000000001","name":"Walk","icon":"✦","start_date":"2020-01-01","display_order":0,"archived_at":null,"updated_at":"2026-01-01T00:00:00Z","mutation_id":"20000000-0000-0000-0000-000000000001"}');
select public.apply_daily_check('{"id":"10000000-0000-0000-0000-000000000001:2026-01-01","user_id":"00000000-0000-0000-0000-000000000001","habit_id":"10000000-0000-0000-0000-000000000001","local_date":"2026-01-01","completed_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z","mutation_id":"20000000-0000-0000-0000-000000000001"}');
-- A later undo must survive a delayed retry from another device.
select public.apply_daily_check('{"id":"10000000-0000-0000-0000-000000000001:2026-01-01","user_id":"00000000-0000-0000-0000-000000000001","habit_id":"10000000-0000-0000-0000-000000000001","local_date":"2026-01-01","completed_at":null,"updated_at":"2026-01-02T00:00:00Z","mutation_id":"20000000-0000-0000-0000-000000000002"}');
select public.apply_daily_check('{"id":"10000000-0000-0000-0000-000000000001:2026-01-01","user_id":"00000000-0000-0000-0000-000000000001","habit_id":"10000000-0000-0000-0000-000000000001","local_date":"2026-01-01","completed_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z","mutation_id":"20000000-0000-0000-0000-000000000001"}');
do $$ begin
  if (select count(*) from public.daily_checks) <> 1 or exists(select 1 from public.daily_checks where completed_at is not null) then raise exception 'Retry resurrected undo'; end if;
  begin
    insert into public.daily_checks values ('10000000-0000-0000-0000-000000000001:2099-01-01','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2099-01-01',now(),now(),gen_random_uuid());
    raise exception 'Future date accepted';
  exception when raise_exception then
    if sqlerrm = 'Future date accepted' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
insert into public.profiles values ('00000000-0000-0000-0000-000000000002','America/Los_Angeles');
do $$ begin
  if exists(select 1 from public.habits) or exists(select 1 from public.daily_checks) then raise exception 'Cross-account read leak'; end if;
  begin
    insert into public.habits values (gen_random_uuid(),'00000000-0000-0000-0000-000000000001','Intrusion','✦','2020-01-01',0,null,now(),gen_random_uuid());
    raise exception 'Cross-account write accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
