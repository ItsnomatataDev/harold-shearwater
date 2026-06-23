revoke all on function public.request_harold_handover(uuid, text) from public;
revoke all on function public.request_harold_handover(uuid, text) from anon;
revoke all on function public.claim_harold_handover(uuid, uuid) from public;
revoke all on function public.claim_harold_handover(uuid, uuid) from anon;
revoke all on function public.resolve_harold_handover(uuid, uuid) from public;
revoke all on function public.resolve_harold_handover(uuid, uuid) from anon;

grant execute on function public.request_harold_handover(uuid, text) to authenticated;
grant execute on function public.claim_harold_handover(uuid, uuid) to authenticated;
grant execute on function public.resolve_harold_handover(uuid, uuid) to authenticated;
