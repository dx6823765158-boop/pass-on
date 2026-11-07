-- Storage API ต้องมีสิทธิ์ SELECT ก่อนถึงจะลบไฟล์ได้ (ไม่มี → remove() ไม่ error แต่ไม่ลบ)
-- รูปโปรไฟล์ดูผ่าน public URL อยู่แล้ว จึงให้ select เฉพาะโฟลเดอร์ตัวเอง (กันการ list ทั้ง bucket)
create policy "avatar select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
