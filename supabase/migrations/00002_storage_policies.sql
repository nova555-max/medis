-- Storage policies: path must start with company_id

create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy avatars_write_company on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy avatars_update_company on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy documents_company on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy selfies_company on storage.objects
  for all to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy backups_admin_only on storage.objects
  for all to authenticated
  using (
    bucket_id = 'backups'
    and public.is_company_admin()
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'backups'
    and public.is_company_admin()
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );
