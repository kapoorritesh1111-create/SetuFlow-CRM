type MailboxShape = { id:string; address:string; display_name?:string|null; inbound_enabled?:boolean; status:string };

export async function resolveUserMailbox(supabase:any, organizationId:string, userId:string, select='id,address,display_name,inbound_enabled,status'):Promise<MailboxShape|null>{
  const {data:primary}=await supabase.from('mail_mailbox_access').select('mailbox_id').eq('organization_id',organizationId).eq('user_id',userId).eq('is_primary',true).limit(1).maybeSingle();
  if(primary?.mailbox_id){const {data}=await supabase.from('mail_mailboxes').select(select).eq('id',primary.mailbox_id).eq('organization_id',organizationId).eq('status','active').maybeSingle();if(data)return data as MailboxShape;}
  const {data:access}=await supabase.from('mail_mailbox_access').select('mailbox_id').eq('organization_id',organizationId).eq('user_id',userId).eq('can_read',true).limit(1).maybeSingle();
  if(access?.mailbox_id){const {data}=await supabase.from('mail_mailboxes').select(select).eq('id',access.mailbox_id).eq('organization_id',organizationId).eq('status','active').maybeSingle();if(data)return data as MailboxShape;}
  return null;
}
