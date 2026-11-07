-- แอปฟัง realtime ทุกตารางที่แสดงผล เพื่อรีโหลดเมื่อมีคนอื่นแก้ข้อมูล
alter publication supabase_realtime add table public.profiles, public.courses, public.attachments, public.enrollments;
