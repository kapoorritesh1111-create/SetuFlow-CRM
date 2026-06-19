type DbClient = any;

type SavedLeadForIntro = {
  id: string;
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  source_type?: string | null;
  source_label?: string | null;
  trade_event_id?: string | null;
  next_follow_up_at?: string | null;
  intro_sent?: boolean | null;
};

type OrganizationForIntro = {
  id: string;
  name?: string | null;
  website?: string | null;
  contact_email?: string | null;
};

type IntroParams = {
  db: DbClient;
  organization: OrganizationForIntro;
  actorUserId: string;
  lead: SavedLeadForIntro;
  productIds?: string[];
  categoryIds?: string[];
  rawInterestNote?: string | null;
};

type IntroContext = {
  recipientName: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderWhatsapp: string;
  organizationName: string;
  organizationWebsite: string;
  organizationCategory: string;
  sourceLabel: string;
  eventName: string;
  boothNumber: string;
  productInterest: string;
  followUpLabel: string;
  vcardUrl: string;
  vcfUrl: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return '';
}

function formatFollowUp(value?: string | null) {
  const raw = clean(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function publicBaseUrl() {
  return (clean(process.env.NEXT_PUBLIC_SITE_URL) || clean(process.env.NEXT_PUBLIC_APP_URL) || 'https://www.setuflowcrm.com').replace(/\/$/, '');
}

function structuredInterestFromNote(value?: string | null) {
  const lines = clean(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const line = [...lines].reverse().find((item) => /^(interested in products|interested in category|can supply products|can supply category|new buyer request|new supplier category):/i.test(item));
  return line?.replace(/^(interested in products|interested in category|can supply products|can supply category|new buyer request|new supplier category):\s*/i, '').trim() ?? '';
}

async function loadProductInterest(db: DbClient, organizationId: string, productIds: string[], categoryIds: string[], rawInterestNote?: string | null) {
  const structured = structuredInterestFromNote(rawInterestNote);
  if (structured) return structured;

  if (productIds.length) {
    const { data } = await db.from('products').select('name').eq('organization_id', organizationId).in('id', productIds).limit(4);
    const names = (data ?? []).map((item: { name?: string | null }) => clean(item.name)).filter(Boolean);
    if (names.length) return names.join(', ');
  }

  if (categoryIds.length) {
    const { data } = await db.from('product_categories').select('name').eq('organization_id', organizationId).in('id', categoryIds).limit(4);
    const names = (data ?? []).map((item: { name?: string | null }) => clean(item.name)).filter(Boolean);
    if (names.length) return names.join(', ');
  }

  return 'your request';
}

async function loadOrganizationCategory(db: DbClient, organizationId: string) {
  const { data: trial } = await db.from('trade_show_trial_workspaces').select('main_product_category').eq('organization_id', organizationId).maybeSingle();
  if (clean(trial?.main_product_category)) return clean(trial.main_product_category);

  const { data: onboarding } = await db
    .from('client_onboarding_requests')
    .select('product_category_notes, industry')
    .eq('linked_organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return firstText(onboarding?.product_category_notes, onboarding?.industry, 'our products');
}

async function loadIntroContext(params: IntroParams): Promise<IntroContext> {
  const { db, organization, actorUserId, lead } = params;
  const [{ data: profile }, { data: card }, { data: event }] = await Promise.all([
    db.from('profiles').select('full_name, email').eq('id', actorUserId).maybeSingle(),
    db.from('my_card_settings').select('share_slug, primary_phone, secondary_phone, website').eq('user_id', actorUserId).maybeSingle(),
    lead.trade_event_id
      ? db.from('trade_events').select('name, booth_number, city, country').eq('organization_id', organization.id).eq('id', lead.trade_event_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const shareSlug = clean(card?.share_slug);
  const baseUrl = publicBaseUrl();
  const vcardUrl = shareSlug ? `${baseUrl}/card?share=${encodeURIComponent(shareSlug)}` : '';
  const vcfUrl = shareSlug ? `${baseUrl}/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}` : '';
  const eventName = firstText(event?.name, lead.source_label);

  return {
    recipientName: firstText(lead.contact_name, lead.company_name, 'there'),
    senderName: firstText(profile?.full_name, profile?.email, 'Your contact'),
    senderEmail: firstText(profile?.email, organization.contact_email),
    senderPhone: firstText(card?.primary_phone, card?.secondary_phone),
    senderWhatsapp: firstText(card?.primary_phone, card?.secondary_phone),
    organizationName: firstText(organization.name, 'our team'),
    organizationWebsite: firstText(card?.website, organization.website),
    organizationCategory: await loadOrganizationCategory(db, organization.id),
    sourceLabel: firstText(eventName, lead.source_label, lead.source_type, 'our recent conversation'),
    eventName,
    boothNumber: clean(event?.booth_number),
    productInterest: await loadProductInterest(db, organization.id, params.productIds ?? [], params.categoryIds ?? [], params.rawInterestNote),
    followUpLabel: formatFollowUp(lead.next_follow_up_at),
    vcardUrl,
    vcfUrl,
  };
}

function buildEmailMessage(ctx: IntroContext) {
  const subject = `Great meeting you at ${ctx.eventName || ctx.sourceLabel}`;
  const whereLine = ctx.eventName
    ? `It was great meeting you at ${ctx.eventName}.`
    : `It was great connecting with you through ${ctx.sourceLabel}.`;
  const boothText = ctx.boothNumber ? ` booth ${ctx.boothNumber}` : '';
  const followUpLine = ctx.followUpLabel
    ? `I’ll follow up with you on ${ctx.followUpLabel}. You can also reach me anytime using the contact details below.`
    : 'I’ll follow up with you soon. You can also reach me anytime using the contact details below.';
  const contactLines = [
    ctx.senderEmail ? `Email: ${ctx.senderEmail}` : '',
    ctx.senderPhone ? `Phone: ${ctx.senderPhone}` : '',
    ctx.senderWhatsapp ? `WhatsApp: ${ctx.senderWhatsapp}` : '',
    ctx.organizationWebsite ? `Website: ${ctx.organizationWebsite}` : '',
  ].filter(Boolean);
  const cardLines = [
    ctx.vcardUrl ? `You can save my digital vCard here: ${ctx.vcardUrl}` : '',
    ctx.vcfUrl ? `Download contact file: ${ctx.vcfUrl}` : '',
  ].filter(Boolean);

  return {
    subject,
    body: [
      `Hi ${ctx.recipientName},`,
      '',
      whereLine,
      '',
      `Thank you for stopping by${boothText} and speaking with ${ctx.senderName} from ${ctx.organizationName}. We specialize in ${ctx.organizationCategory}, and I wanted to reconnect while the conversation is fresh.`,
      '',
      `I noted your interest in ${ctx.productInterest}. I’ll be happy to share more details and answer any questions.`,
      '',
      followUpLine,
      '',
      'Best regards,',
      ctx.senderName,
      ctx.organizationName,
      '',
      ...contactLines,
      ...(cardLines.length ? ['', ...cardLines] : []),
    ].join('\n'),
  };
}

function buildMessageText(ctx: IntroContext) {
  const where = ctx.eventName ? ` at ${ctx.eventName}` : ` through ${ctx.sourceLabel}`;
  const booth = ctx.boothNumber ? ` Thanks for stopping by booth ${ctx.boothNumber}.` : '';
  const followUp = ctx.followUpLabel ? ` I’ll follow up with you on ${ctx.followUpLabel}.` : ' I’ll follow up with you soon.';
  const contact = [ctx.senderEmail, ctx.senderPhone].filter(Boolean).join(' or ');
  const contactText = contact ? ` You can also reach me at ${contact}.` : '';
  const cardText = ctx.vcardUrl ? ` You can save my vCard here: ${ctx.vcardUrl}` : '';
  return `Hi ${ctx.recipientName}, great meeting you${where}. This is ${ctx.senderName} from ${ctx.organizationName}.${booth} We specialize in ${ctx.organizationCategory}, and I noted your interest in ${ctx.productInterest}.${followUp}${contactText}${cardText}`;
}

async function communicationAlreadyExists(db: DbClient, leadId: string) {
  const { data } = await db.from('communications').select('id').eq('lead_id', leadId).eq('communication_type', 'lead_capture_intro').limit(1);
  return Array.isArray(data) && data.length > 0;
}

async function insertCommunication(db: DbClient, row: Record<string, unknown>) {
  return db.from('communications').insert({
    related_entity: 'lead',
    communication_type: 'lead_capture_intro',
    draft_source: 'lead_capture_intro_service',
    provider_payload: {},
    metadata: {},
    ...row,
  });
}

export async function recordLeadCaptureIntro(params: IntroParams) {
  try {
    const { db, organization, actorUserId, lead } = params;
    if (!lead?.id) return { ok: false, reason: 'missing_lead' };
    if (await communicationAlreadyExists(db, lead.id)) return { ok: true, skipped: 'already_recorded' };

    const ctx = await loadIntroContext(params);
    const emailMessage = buildEmailMessage(ctx);
    const whatsappMessage = buildMessageText(ctx);
    const nowIso = new Date().toISOString();
    const baseMetadata = {
      source: 'lead_capture_intro_service',
      event_name: ctx.eventName,
      booth_number: ctx.boothNumber,
      organization_category: ctx.organizationCategory,
      product_interest: ctx.productInterest,
      follow_up_at: lead.next_follow_up_at ?? null,
      vcard_url: ctx.vcardUrl,
      vcf_url: ctx.vcfUrl,
    };

    let emailStatus = 'not_available';
    let whatsappStatus = 'not_available';
    let hasCustomerChannel = false;

    if (clean(lead.email)) {
      hasCustomerChannel = true;
      emailStatus = 'queued';
      await insertCommunication(db, {
        organization_id: organization.id,
        lead_id: lead.id,
        related_id: lead.id,
        direction: 'outbound',
        channel: 'email',
        subject: emailMessage.subject,
        body: emailMessage.body,
        summary: 'Intro email queued after lead capture.',
        status: 'queued',
        sent_at: null,
        scheduled_at: lead.next_follow_up_at ?? null,
        created_by: actorUserId,
        email_delivery_status: 'queued',
        metadata: { ...baseMetadata, target: clean(lead.email), vcard_available: Boolean(ctx.vcardUrl) },
      });
    }

    const whatsappTarget = clean(lead.whatsapp_number || lead.phone);
    if (whatsappTarget) {
      hasCustomerChannel = true;
      whatsappStatus = 'draft';
      await insertCommunication(db, {
        organization_id: organization.id,
        lead_id: lead.id,
        related_id: lead.id,
        direction: 'outbound',
        channel: 'whatsapp',
        subject: 'Lead capture intro WhatsApp',
        body: whatsappMessage,
        summary: 'Intro WhatsApp drafted after lead capture.',
        status: 'draft',
        sent_at: null,
        scheduled_at: lead.next_follow_up_at ?? null,
        created_by: actorUserId,
        whatsapp_link_type: 'draft',
        metadata: { ...baseMetadata, target: whatsappTarget, vcard_available: Boolean(ctx.vcardUrl), live_delivery_enabled: false },
      });
    }

    await insertCommunication(db, {
      organization_id: organization.id,
      lead_id: lead.id,
      related_id: lead.id,
      direction: 'internal',
      channel: 'system',
      subject: 'Intro message created after lead capture',
      body: [
        'Intro message created after lead capture.',
        '',
        `Email: ${emailStatus}`,
        `WhatsApp: ${whatsappStatus}`,
        `vCard: ${ctx.vcardUrl ? 'linked' : 'not available'}`,
        `Follow-up: ${ctx.followUpLabel || 'follow up soon'}`,
        '',
        'Customer-facing context:',
        `- Event/source: ${ctx.eventName || ctx.sourceLabel}`,
        `- Booth/source detail: ${ctx.boothNumber || 'not set'}`,
        `- Sender: ${ctx.senderName}`,
        `- Organization: ${ctx.organizationName}`,
        `- Category: ${ctx.organizationCategory}`,
        `- Product/request: ${ctx.productInterest}`,
        '',
        'Internal note: saved separately for team visibility only. Not included in customer message.',
      ].join('\n'),
      summary: hasCustomerChannel ? 'Lead capture intro prepared.' : 'Lead capture intro skipped because no customer channel exists.',
      status: 'sent',
      sent_at: nowIso,
      created_by: actorUserId,
      metadata: { ...baseMetadata, email_status: emailStatus, whatsapp_status: whatsappStatus },
    });

    if (hasCustomerChannel) {
      await db.from('leads').update({ intro_sent: true, last_contacted_at: nowIso }).eq('organization_id', organization.id).eq('id', lead.id);
    }

    return { ok: true, emailStatus, whatsappStatus };
  } catch (error) {
    console.warn('[lead-capture-intro] non-blocking intro failed', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown_error' };
  }
}
