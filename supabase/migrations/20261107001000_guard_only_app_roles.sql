-- guard ใช้กับคำขอจากแอปเท่านั้น (role authenticated / anon)
-- SQL Editor / service_role ตั้งแอดมินคนแรกได้: update profiles set role = 'admin' where student_id = '...';
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or private.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'student';
  else
    if new.role is distinct from old.role then
      raise exception 'เปลี่ยนสิทธิ์ผู้ใช้ได้เฉพาะแอดมิน';
    end if;
    if new.student_id is distinct from old.student_id then
      raise exception 'เปลี่ยนรหัสนักศึกษาได้เฉพาะแอดมิน';
    end if;
  end if;
  return new;
end;
$$;
