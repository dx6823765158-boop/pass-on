-- รหัสนักศึกษาตั้งได้ครั้งเดียวตอนสร้างโปรไฟล์ — เปลี่ยนภายหลังได้เฉพาะแอดมิน
-- (แอปใช้ studentId ระบุตัวผู้เขียนโพสต์ ถ้าเปลี่ยนได้เองจะสวมรอยเป็นรหัสอื่นได้)
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
  else
    if new.role is distinct from old.role and not private.is_admin() then
      raise exception 'เปลี่ยนสิทธิ์ผู้ใช้ได้เฉพาะแอดมิน';
    end if;
    if new.student_id is distinct from old.student_id and not private.is_admin() then
      raise exception 'เปลี่ยนรหัสนักศึกษาได้เฉพาะแอดมิน';
    end if;
  end if;
  return new;
end;
$$;
