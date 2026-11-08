-- รับอีเมลจากโดเมนย่อยของโดเมนที่อนุญาตด้วย (เช่น citu.tu.ac.th, econ.tu.ac.th ภายใต้ tu.ac.th)
create or replace function public.enforce_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dom text := lower(split_part(coalesce(new.email, ''), '@', 2));
begin
  if dom = '' or not exists (
    select 1 from public.allowed_email_domains d
    where dom = d.domain or dom like '%.' || d.domain
  ) then
    raise exception 'สมัครได้เฉพาะอีเมลมหาวิทยาลัยธรรมศาสตร์ (@dome.tu.ac.th หรือ @*.tu.ac.th)';
  end if;
  return new;
end;
$$;
