-- Pass On — Storage (แทนการเก็บไฟล์ base64 เป็นชิ้นใน Firestore)
-- avatars:     public  · {user_id}/avatar.jpg
-- attachments: private · {user_id}/{post_id}/{file}  → เปิดด้วย signed URL

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('attachments', 'attachments', false, 10 * 1024 * 1024, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ])
on conflict (id) do nothing;

-- ---------- avatars ----------
create policy "avatar upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- attachments ----------
create policy "attachment upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- อ่านได้เมื่อไฟล์นี้ (หรือภาพย่อ) ผูกกับโพสต์ที่ผู้ใช้มองเห็น — ใช้ RLS ของ attachments/posts ต่อ
create policy "attachment read via visible post" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.attachments a
        where a.storage_path = storage.objects.name or a.thumb_path = storage.objects.name
      )
    )
  );
create policy "attachment delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
