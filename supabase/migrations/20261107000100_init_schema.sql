-- Pass On — โครงสร้างฐานข้อมูลหลัก
-- อ้างอิง: PassOn Database Design-2.pdf (8 ตาราง) + ตารางเสริมจากฟีเจอร์ใน mockup
-- ดู docs/PLAN-supabase.md ข้อ 3

-- ============================ ชนิดข้อมูล ============================
create type public.user_role as enum ('student', 'admin');
create type public.post_status as enum ('published', 'hidden');
create type public.enrollment_status as enum ('studying', 'completed');
create type public.exam_kind as enum ('midterm', 'final', 'quiz', 'project', 'other');

-- ============================ โดเมนอีเมลที่สมัครได้ ============================
create table public.allowed_email_domains (
  domain text primary key check (domain = lower(domain))
);
comment on table public.allowed_email_domains is 'โดเมนอีเมลที่สมัครสมาชิกได้ (เช่น dome.tu.ac.th) — แอดมินเพิ่ม gmail.com ชั่วคราวเพื่อทดสอบได้';

-- ============================ profiles (users ในเอกสารออกแบบ) ============================
-- รหัสผ่าน / อีเมล เก็บใน auth.users ของ Supabase Auth — ไม่มี password_hash ที่นี่
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  student_id char(10) not null unique check (student_id ~ '^[0-9]{10}$'),
  display_name varchar(40) not null check (length(trim(display_name)) > 0),
  entry_year smallint check (entry_year between 2500 and 2700),
  program varchar(20) not null default 'DX',
  year_label text,                          -- 'ปี 1' .. 'ปี 4', 'ศิษย์เก่า'
  bio varchar(200),
  avatar_path text,                         -- path ใน bucket avatars
  color text,
  emoji text,
  pattern text,
  frame text,
  shape text,
  status jsonb,                             -- { emoji, text }
  interests text[] not null default '{}',
  links jsonb not null default '{}'::jsonb, -- { ig, gh, li }
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================ courses ============================
-- ชื่อวิชาใน มคอ.2 เป็นภาษาอังกฤษ จึงให้ name_en เป็นช่องหลัก (NN) และ name_th เว้นว่างได้
create table public.courses (
  id bigint generated always as identity primary key,
  course_code varchar(10) not null unique,
  name_en varchar(150) not null,
  name_th varchar(150),
  credits smallint default 3,
  year_level smallint check (year_level between 1 and 4),
  semester text,                            -- '1/2025', 'S/2027', 'GE', 'FREE'
  track text,                               -- หมวดวิชาเลือก
  icon text,                                -- ชื่อไอคอน Feather
  instructor varchar(120)
);

create table public.instructors (
  id bigint generated always as identity primary key,
  name text not null,
  name_en text,
  role text,
  group_name text,
  sort_order smallint not null default 0
);

-- ============================ categories ============================
create table public.categories (
  id smallint generated always as identity primary key,
  slug varchar(30) not null unique,
  name_th varchar(50) not null unique,
  color_hex char(7)
);

-- ============================ posts ============================
create table public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  course_id bigint references public.courses (id) on delete restrict, -- ว่างได้เฉพาะกระทู้ถาม-ตอบ (ตรวจใน trigger)
  category_id smallint not null references public.categories (id) on delete restrict,
  title varchar(200) not null check (length(trim(title)) > 0),
  content text check (length(content) <= 20000),
  academic_year smallint,
  term smallint check (term between 1 and 3),
  status public.post_status not null default 'published',
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ============================ attachments ============================
create table public.attachments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  file_name varchar(255) not null,
  storage_path text not null unique,        -- path ใน bucket attachments: {user_id}/{post_id}/{file}
  thumb_path text,                          -- ภาพย่อ 320px สำหรับรูป
  file_type varchar(100) not null,
  file_size_kb integer not null check (file_size_kb >= 0),
  uploaded_at timestamptz not null default now()
);

-- ============================ comments ============================
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  parent_comment_id bigint references public.comments (id) on delete set null,
  content text not null check (length(trim(content)) between 1 and 2000),
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================ likes ============================
create table public.likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ============================ enrollments ============================
create table public.enrollments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete restrict,
  academic_year smallint not null,
  term smallint not null check (term between 1 and 3),
  status public.enrollment_status not null default 'studying',
  unique (user_id, course_id, academic_year, term)
);

-- ============================ ตารางเสริมจาก mockup ============================
create table public.favorite_courses (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete cascade,
  primary key (user_id, course_id)
);

-- owner_id ว่าง = ตารางสอบกลางจากแอดมิน (ทุกคนเห็น), มีค่า = วันสอบส่วนตัว
create table public.exam_events (
  id bigint generated always as identity primary key,
  owner_id uuid references public.profiles (id) on delete cascade,
  course_id bigint references public.courses (id) on delete set null,
  title varchar(100) not null check (length(trim(title)) > 0),
  kind public.exam_kind not null default 'other',
  starts_at timestamptz not null,
  place varchar(100),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id bigint generated always as identity primary key,
  text varchar(200) not null check (length(trim(text)) > 0),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================ index ============================
create index courses_name_en_idx on public.courses (name_en);
create index posts_course_created_idx on public.posts (course_id, created_at desc);
create index posts_category_created_idx on public.posts (category_id, created_at desc);
create index posts_user_idx on public.posts (user_id);
create index posts_created_idx on public.posts (created_at desc);
create index attachments_post_idx on public.attachments (post_id);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index comments_user_idx on public.comments (user_id);
create index comments_parent_idx on public.comments (parent_comment_id);
create index likes_post_idx on public.likes (post_id);
create index enrollments_course_idx on public.enrollments (course_id);
create index favorite_courses_course_idx on public.favorite_courses (course_id);
create index exam_events_owner_starts_idx on public.exam_events (owner_id, starts_at);
create index exam_events_course_idx on public.exam_events (course_id);
create index exam_events_created_by_idx on public.exam_events (created_by);
create index announcements_created_by_idx on public.announcements (created_by);
create index announcements_active_idx on public.announcements (created_at desc) where is_active;

-- ============================ ฟังก์ชันช่วย ============================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- โปรไฟล์: ผู้ใช้ทั่วไปตั้ง / เปลี่ยน role เองไม่ได้
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'student' and not public.is_admin() then
      new.role := 'student';
    end if;
  elsif new.role is distinct from old.role and not public.is_admin() then
    raise exception 'เปลี่ยนสิทธิ์ผู้ใช้ได้เฉพาะแอดมิน';
  end if;
  return new;
end;
$$;

-- โพสต์: ต้องมีวิชา ยกเว้นกระทู้ถาม-ตอบ / ห้ามเปลี่ยนเจ้าของ / ยอดวิวแก้ผ่าน RPC เท่านั้น
create or replace function public.validate_post()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat_slug text;
begin
  select slug into cat_slug from public.categories where id = new.category_id;
  if new.course_id is null and cat_slug <> 'question' then
    raise exception 'โพสต์ประเภท % ต้องเลือกวิชา', cat_slug;
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then
      raise exception 'เปลี่ยนเจ้าของโพสต์ไม่ได้';
    end if;
    if new.view_count <> old.view_count and current_setting('passon.counting_view', true) is distinct from 'on' then
      new.view_count := old.view_count;
    end if;
    new.updated_at := now();
  else
    new.view_count := 0;
  end if;
  return new;
end;
$$;

-- คอมเมนต์: is_accepted แก้ได้เฉพาะเจ้าของโพสต์ / เนื้อหาแก้ได้เฉพาะคนเขียน
create or replace function public.guard_comment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  post_owner uuid;
  me uuid := (select auth.uid());
begin
  if new.post_id <> old.post_id or new.user_id <> old.user_id or new.parent_comment_id is distinct from old.parent_comment_id then
    raise exception 'แก้ไขช่องนี้ไม่ได้';
  end if;
  select user_id into post_owner from public.posts where id = new.post_id;
  if new.is_accepted is distinct from old.is_accepted and me is distinct from post_owner then
    raise exception 'เลือกคำตอบที่ดีที่สุดได้เฉพาะเจ้าของกระทู้';
  end if;
  if new.content is distinct from old.content and me is distinct from old.user_id then
    raise exception 'แก้ไขได้เฉพาะคอมเมนต์ของตัวเอง';
  end if;
  return new;
end;
$$;

-- นับยอดวิว (เรียกจากแอปตอนเปิดโพสต์)
create or replace function public.increment_view(p_post_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('passon.counting_view', 'on', true);
  update public.posts
     set view_count = view_count + 1
   where id = p_post_id and status = 'published';
  perform set_config('passon.counting_view', 'off', true);
end;
$$;

-- จำกัดโดเมนอีเมลตอนสมัคร
create or replace function public.enforce_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1 from public.allowed_email_domains d
    where lower(split_part(new.email, '@', 2)) = d.domain
  ) then
    raise exception 'สมัครได้เฉพาะอีเมลมหาวิทยาลัย (@dome.tu.ac.th)';
  end if;
  return new;
end;
$$;

-- ============================ trigger ============================
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profiles_guard_role before insert or update on public.profiles
  for each row execute function public.guard_profile_role();
create trigger posts_validate before insert or update on public.posts
  for each row execute function public.validate_post();
create trigger comments_guard_update before update on public.comments
  for each row execute function public.guard_comment_update();
create trigger auth_users_email_domain before insert on auth.users
  for each row execute function public.enforce_email_domain();

-- ============================ view: ตัวนับ ============================
create view public.post_stats
with (security_invoker = true) as
select
  p.id as post_id,
  (select count(*) from public.likes l where l.post_id = p.id) as like_count,
  (select count(*) from public.comments c where c.post_id = p.id) as comment_count
from public.posts p;

-- ใช้คำนวณ XP / เลเวล / เหรียญ ในแอป (สูตรเดิมจาก profileStats)
create view public.user_stats
with (security_invoker = true) as
select
  pr.id as user_id,
  (select count(*) from public.posts p join public.categories c on c.id = p.category_id
     where p.user_id = pr.id and p.status = 'published' and c.slug <> 'question') as posts,
  (select count(*) from public.posts p join public.categories c on c.id = p.category_id
     where p.user_id = pr.id and p.status = 'published' and c.slug in ('summary', 'exam_tip', 'problem')) as summaries,
  (select count(*) from public.posts p join public.categories c on c.id = p.category_id
     where p.user_id = pr.id and p.status = 'published' and c.slug = 'project') as projects,
  (select count(*) from public.posts p join public.categories c on c.id = p.category_id
     where p.user_id = pr.id and p.status = 'published' and c.slug = 'question') as threads,
  (select count(*) from public.comments cm where cm.user_id = pr.id) as answers,
  (select count(*) from public.likes l join public.posts p on p.id = l.post_id
     where p.user_id = pr.id) as likes_received,
  (pr.avatar_path is not null and coalesce(pr.bio, '') <> '' and cardinality(pr.interests) > 0) as profile_complete
from public.profiles pr;

-- ============================ Realtime ============================
alter publication supabase_realtime add table public.posts, public.comments, public.likes;
