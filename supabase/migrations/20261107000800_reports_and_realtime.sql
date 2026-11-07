-- เฟส 3–4: สีประกาศ, รายงานเนื้อหาไม่เหมาะสม, realtime ตารางสอบ/ประกาศ

alter table public.announcements
  add column color text not null default 'yellow';

create type public.report_status as enum ('open', 'resolved');

create table public.reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  comment_id bigint references public.comments (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason varchar(200) not null check (length(trim(reason)) > 0),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz
);
create index reports_post_idx on public.reports (post_id);
create index reports_comment_idx on public.reports (comment_id);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
create index reports_open_idx on public.reports (created_at desc) where status = 'open';
-- รายงานเรื่องเดียวกันซ้ำไม่ได้ (ต่อคน ต่อโพสต์/คอมเมนต์ ขณะที่ยังเปิดอยู่)
create unique index reports_one_open_per_target on public.reports (reporter_id, post_id, coalesce(comment_id, 0)) where status = 'open';

alter table public.reports enable row level security;

create policy "report as self on visible post" on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "admin or reporter reads reports" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy "admin resolves reports" on public.reports
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

alter publication supabase_realtime add table public.exam_events, public.announcements, public.reports;
