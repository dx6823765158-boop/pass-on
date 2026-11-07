-- Pass On — Row Level Security (แทน firestore.rules)
-- หลัก: ต้องล็อกอินถึงจะอ่านเนื้อหาได้ / เขียนได้เฉพาะของตัวเอง / แอดมินดูแลตามบทบาทใน profiles.role

alter table public.allowed_email_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.instructors enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.enrollments enable row level security;
alter table public.favorite_courses enable row level security;
alter table public.exam_events enable row level security;
alter table public.announcements enable row level security;

-- ---------- allowed_email_domains: แอดมินเท่านั้น ----------
create policy "admin manages email domains" on public.allowed_email_domains
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- profiles ----------
create policy "profiles readable by members" on public.profiles
  for select to authenticated using (true);
create policy "create own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "update own profile or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ---------- ข้อมูลอ้างอิง: ทุกคนอ่านได้ แอดมินแก้ ----------
create policy "courses readable" on public.courses for select to anon, authenticated using (true);
create policy "admin inserts courses" on public.courses for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates courses" on public.courses for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes courses" on public.courses for delete to authenticated using ((select public.is_admin()));

create policy "instructors readable" on public.instructors for select to anon, authenticated using (true);
create policy "admin inserts instructors" on public.instructors for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates instructors" on public.instructors for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes instructors" on public.instructors for delete to authenticated using ((select public.is_admin()));

create policy "categories readable" on public.categories for select to anon, authenticated using (true);
create policy "admin inserts categories" on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates categories" on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes categories" on public.categories for delete to authenticated using ((select public.is_admin()));

-- ---------- posts ----------
create policy "read published, own or admin" on public.posts
  for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "create own post" on public.posts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'published');
create policy "update own post or admin" on public.posts
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "delete own post or admin" on public.posts
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- attachments (มองเห็นตามโพสต์) ----------
create policy "read attachments of visible posts" on public.attachments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "attach to own post" on public.attachments
  for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())));
create policy "remove attachment from own post or admin" on public.attachments
  for delete to authenticated
  using ((select public.is_admin()) or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())));

-- ---------- comments ----------
create policy "read comments of visible posts" on public.comments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "comment as self on visible post" on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and is_accepted = false
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
-- คนเขียนแก้ข้อความ / เจ้าของโพสต์ติ๊กคำตอบที่ดีที่สุด (แยกช่องใน trigger guard_comment_update)
create policy "author or post owner updates comment" on public.comments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );
create policy "delete own comment or admin" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- likes ----------
create policy "likes readable" on public.likes
  for select to authenticated using (true);
create policy "like as self" on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
create policy "unlike own" on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- enrollments (ส่วนตัว) ----------
create policy "read own enrollments" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own enrollment" on public.enrollments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own enrollment" on public.enrollments
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "remove own enrollment" on public.enrollments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- favorite_courses (แสดงบนโปรไฟล์ — ทุกคนอ่านได้) ----------
create policy "favorite courses readable" on public.favorite_courses
  for select to authenticated using (true);
create policy "add own favorite" on public.favorite_courses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own favorite" on public.favorite_courses
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- exam_events: ตารางกลาง (owner_id ว่าง) + ของตัวเอง ----------
create policy "read shared and own exams" on public.exam_events
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "add own exam or shared as admin" on public.exam_events
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or (owner_id is null and (select public.is_admin())));
create policy "edit own exam or shared as admin" on public.exam_events
  for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and (select public.is_admin())))
  with check (owner_id = (select auth.uid()) or (owner_id is null and (select public.is_admin())));
create policy "delete own exam or shared as admin" on public.exam_events
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and (select public.is_admin())));

-- ---------- announcements ----------
create policy "announcements readable" on public.announcements
  for select to anon, authenticated using (true);
create policy "admin inserts announcements" on public.announcements for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates announcements" on public.announcements for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes announcements" on public.announcements for delete to authenticated using ((select public.is_admin()));

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------
revoke execute on function public.enforce_email_domain() from public, anon, authenticated;
revoke execute on function public.increment_view(bigint) from public, anon;
grant execute on function public.increment_view(bigint) to authenticated;
grant execute on function public.enforce_email_domain() to supabase_auth_admin;
