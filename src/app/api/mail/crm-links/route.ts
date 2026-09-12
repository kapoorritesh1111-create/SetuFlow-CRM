import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';

export const dynamic = 'force-dynamic';
const TYPES = new Set(['contact','lead','buyer','supplier']);
const clean=(value:unknown,max=120)=>String(value??'').trim().slice(0,max);

async function context(){
  const workspace=await getCurrentWorkspace();
  if(!workspace.user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(!workspace.organization||!workspace.membership)return{error:NextResponse.json({error:'Active workspace required.'},{status:403})};
  const db=(await createClient())as any; const mailbox=await resolveUserMailbox(db,workspace.organization.id,workspace.user.id,'id,address,status');
  if(!mailbox)return{error:NextResponse.json({error:'Mailbox not found.'},{status:404})};
  return{workspace,db,mailbox};
}

export async function GET(request:Request){const ctx=await context();if('error'in ctx)return ctx.error;const threadId=clean(new URL(request.url).searchParams.get('threadId'),64);if(!threadId)return NextResponse.json({links:[]});const{workspace,db,mailbox}=ctx;const{data:thread}=await db.from('mail_threads').select('id').eq('organization_id',workspace.organization.id).eq('mailbox_id',mailbox.id).eq('id',threadId).maybeSingle();if(!thread)return NextResponse.json({error:'Mail thread not found.'},{status:404});const{data:links,error}=await db.from('mail_crm_links').select('id,entity_type,entity_id,created_at').eq('organization_id',workspace.organization.id).eq('mailbox_id',mailbox.id).eq('thread_id',threadId);if(error)return NextResponse.json({error:'Unable to load CRM links.'},{status:503});return NextResponse.json({links:links??[]});}

export async function POST(request:Request){const ctx=await context();if('error'in ctx)return ctx.error;const{workspace,db,mailbox}=ctx;const contentType=request.headers.get('content-type')||'';let body:any;if(contentType.includes('application/json'))body=await request.json().catch(()=>({}));else{const form=await request.formData();body={threadId:form.get('threadId'),entityType:form.get('entityType'),entityId:form.get('entityId'),returnTo:form.get('returnTo')}}const threadId=clean(body.threadId,64),entityType=clean(body.entityType,32).toLowerCase(),entityId=clean(body.entityId,64);if(!threadId||!TYPES.has(entityType)||!entityId)return NextResponse.json({error:'Choose a valid Mail thread and CRM record.'},{status:400});const{data:thread}=await db.from('mail_threads').select('id').eq('organization_id',workspace.organization.id).eq('mailbox_id',mailbox.id).eq('id',threadId).maybeSingle();if(!thread)return NextResponse.json({error:'Mail thread not found.'},{status:404});const{error}=await db.from('mail_crm_links').upsert({organization_id:workspace.organization.id,mailbox_id:mailbox.id,thread_id:threadId,entity_type:entityType,entity_id:entityId,created_by:workspace.user.id},{onConflict:'thread_id,entity_type,entity_id'});if(error)return NextResponse.json({error:'Unable to link this CRM record.'},{status:400});if(!contentType.includes('application/json'))return NextResponse.redirect(new URL(clean(body.returnTo,500)||'/mail',request.url),303);return NextResponse.json({ok:true,leadCreated:false});}

export async function DELETE(request:Request){const ctx=await context();if('error'in ctx)return ctx.error;const{workspace,db,mailbox}=ctx;const body=await request.json().catch(()=>({}));const threadId=clean(body.threadId,64),entityType=clean(body.entityType,32),entityId=clean(body.entityId,64);const{error}=await db.from('mail_crm_links').delete().eq('organization_id',workspace.organization.id).eq('mailbox_id',mailbox.id).eq('thread_id',threadId).eq('entity_type',entityType).eq('entity_id',entityId);if(error)return NextResponse.json({error:'Unable to remove CRM link.'},{status:503});return NextResponse.json({ok:true});}
