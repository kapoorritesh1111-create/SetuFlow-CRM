import type { LeadIdentity } from './types'

function digitsOnly(value?: string | null) {
  return String(value ?? '').replace(/[^0-9]/g, '')
}

export function normalizeDialNumber(phone?: string | null, countryCode?: string | null) {
  const phoneDigits = digitsOnly(phone)
  if (!phoneDigits) return null
  const countryDigits = digitsOnly(countryCode)
  if (String(phone ?? '').trim().startsWith('+') || !countryDigits || phoneDigits.startsWith(countryDigits)) {
    return phoneDigits
  }
  return `${countryDigits}${phoneDigits}`
}

export function formatPhoneDisplay(phone?: string | null, countryCode?: string | null) {
  const rawPhone = String(phone ?? '').trim()
  if (!rawPhone) return null
  const rawCountry = String(countryCode ?? '').trim()
  if (!rawCountry) return rawPhone
  const normalizedCountry = rawCountry.startsWith('+') ? rawCountry : `+${digitsOnly(rawCountry)}`
  return rawPhone.startsWith('+') ? rawPhone : `${normalizedCountry} ${rawPhone}`
}

export function getLeadContactActions(lead: LeadIdentity) {
  const primaryPhone = normalizeDialNumber(lead.phone, lead.phoneCountryCode)
  const secondaryPhone = normalizeDialNumber(lead.phoneSecondary, lead.phoneSecondaryCountryCode)
  const whatsappPhone = normalizeDialNumber(lead.whatsappNumber, lead.phoneCountryCode)
    ?? primaryPhone
    ?? secondaryPhone

  return {
    emailHref: lead.email ? `mailto:${lead.email}` : null,
    callHref: primaryPhone ? `tel:+${primaryPhone}` : secondaryPhone ? `tel:+${secondaryPhone}` : null,
    whatsappHref: whatsappPhone ? `https://wa.me/${whatsappPhone}` : null,
    primaryPhoneDisplay: formatPhoneDisplay(lead.phone, lead.phoneCountryCode),
    secondaryPhoneDisplay: formatPhoneDisplay(lead.phoneSecondary, lead.phoneSecondaryCountryCode),
    whatsappDisplay: formatPhoneDisplay(lead.whatsappNumber, lead.phoneCountryCode) ?? formatPhoneDisplay(lead.phone, lead.phoneCountryCode),
    hasPhone: Boolean(primaryPhone || secondaryPhone),
    hasEmail: Boolean(lead.email),
    hasWhatsapp: Boolean(whatsappPhone),
  }
}
