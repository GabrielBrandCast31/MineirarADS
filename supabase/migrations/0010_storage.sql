-- ============================================================================
-- AdMiner — 0010: buckets de storage
--
-- `creatives`  — cópias de criativos, quando o armazenamento for permitido.
--                Privado: o acesso se dá por URL assinada gerada no servidor.
-- `exports`    — relatórios PDF gerados para o workspace.
--
-- Convenção de caminho: {workspace_id}/{ad_id}/{creative_id}.{ext}
-- A primeira pasta é o workspace — é isso que as políticas verificam.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('creatives', 'creatives', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('exports', 'exports', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy "creatives_read_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'creatives'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "creatives_write_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'creatives'
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid, 'member')
  );

create policy "creatives_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'creatives'
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

create policy "exports_read_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exports'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
