-- ย้าย is_admin() ไป schema private (ไม่ถูกเปิดผ่าน REST API /rpc)
-- policy อ้างอิงฟังก์ชันด้วย OID จึงทำงานต่อได้หลังย้าย — แต่ guard_profile_role เรียกด้วยชื่อ ต้องแก้ตัวฟังก์ชันด้วย

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_admin() set schema private;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'student' and not private.is_admin() then
      new.role := 'student';
    end if;
  elsif new.role is distinct from old.role and not private.is_admin() then
    raise exception 'เปลี่ยนสิทธิ์ผู้ใช้ได้เฉพาะแอดมิน';
  end if;
  return new;
end;
$$;
