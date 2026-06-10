-- Storage buckets for property photos, documents, attendance selfies, social media
insert into storage.buckets (id, name, public)
values
  ('property-images', 'property-images', true),
  ('property-documents', 'property-documents', false),
  ('attendance-selfies', 'attendance-selfies', false),
  ('social-media', 'social-media', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Authenticated users can read/write within their org folder.
-- Convention: path is "<org_id>/<rest...>"
create policy "auth read property-images" on storage.objects for select
  using (bucket_id = 'property-images');

create policy "org write property-images" on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

create policy "org update property-images" on storage.objects for update
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

create policy "org delete property-images" on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

-- Same pattern for documents, selfies, social, avatars
create policy "org read property-documents" on storage.objects for select
  using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );
create policy "org write property-documents" on storage.objects for insert
  with check (
    bucket_id = 'property-documents'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

create policy "self read attendance-selfies" on storage.objects for select
  using (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );
create policy "self write attendance-selfies" on storage.objects for insert
  with check (
    bucket_id = 'attendance-selfies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

create policy "public read social-media" on storage.objects for select
  using (bucket_id = 'social-media');
create policy "org write social-media" on storage.objects for insert
  with check (
    bucket_id = 'social-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select organization_id::text from public.profiles where id = auth.uid())
  );

create policy "public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "auth write avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);
