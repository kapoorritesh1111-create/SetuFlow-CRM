(() => {
  'use strict';

  const PRICING_API = '/api/public/pricing-v5-review-preview';
  const FAMILY_API = '/api/public/pricing-v5-family-review';
  const FEEDBACK_API = '/api/public/pricing-v5-feedback';
  const state = {
    catalog: null,
    families: null,
    kld: {},
    approvals: {},
    clarifications: {},
  };

  const $ = (id) => document.getElementById(id);
  const money = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : `₹${Number(value).toFixed(2)}`;
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  async function json(url, options) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) throw new Error(body?.error || `Request failed (${response.status})`);
    return body;
  }

  async function feedback(stepKey, feedbackText, status = 'Approved', priority = 'normal') {
    try {
      await fetch(FEEDBACK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: 'Akshay',
          review_mode: 'admin',
          step_key: stepKey,
          rating: status === 'Approved' ? 5 : status === 'Clarified' ? 4 : 2,
          priority,
          feedback: feedbackText,
          page_path: location.pathname,
        }),
      });
    } catch (_) {}
  }

  function localSizeIndex(select) {
    return Math.max(0, Number(select?.value) || 0);
  }

  function apiSizeFor(select) {
    const list = state.catalog?.sizes || [];
    if (!list.length) return null;
    const index = localSizeIndex(select);
    const local = typeof sizes !== 'undefined' ? sizes[index] : null;
    if (local) {
      const dims = norm(local[0]);
      const matched = list.find((item) => norm(`${item.width_mm}x${item.height_mm}`) === dims || norm(item.name).includes(dims));
      if (matched) return matched;
    }
    return list[index] || list[0];
  }

  function apiConstructionFor(select) {
    const list = state.catalog?.constructions || [];
    if (!list.length) return null;
    const raw = String(select?.value || '0-0').split('-').map(Number);
    const fi = Number.isFinite(raw[0]) ? raw[0] : 0;
    const pi = Number.isFinite(raw[1]) ? raw[1] : 0;
    const familyName = typeof fams !== 'undefined' && fams[fi] ? fams[fi][0] : '';
    const peName = typeof pe !== 'undefined' && pe[pi] ? pe[pi] : '';
    const f = norm(familyName);
    const p = norm(peName);
    const match = list.find((item) => {
      const hay = norm(`${item.name} ${item.family_key || ''} ${item.key || ''}`);
      const familyWords = f.replace(/glossy|matte|touch|clear|window/g, '');
      return (hay.includes(f) || (familyWords && hay.includes(familyWords))) && (!p || hay.includes(p));
    });
    return match || list[fi * 4 + pi] || list[0];
  }

  function selectedChargeCodes(zipSelect) {
    if (!state.catalog?.charges?.length || zipSelect?.value !== 'Yes') return [];
    const zipper = state.catalog.charges.find((c) => /zip/i.test(`${c.code} ${c.name}`));
    return zipper ? [zipper.code] : [];
  }

  async function livePrice(sizeSelect, constructionSelect, qtyInput, printSelect, zipSelect, bottomPrintMode) {
    const size = apiSizeFor(sizeSelect);
    const construction = apiConstructionFor(constructionSelect);
    if (!size || !construction) throw new Error('Published v5 size/construction is unavailable');
    const body = {
      size_profile_id: size.id,
      construction_id: construction.id,
      quantity: Math.max(1, Number(qtyInput?.value) || 5000),
      print: printSelect?.value === 'CMYK' ? 'CMYK' : 'CMYKW',
      selected_charge_codes: selectedChargeCodes(zipSelect),
      bottom_print_mode: bottomPrintMode,
    };
    const data = await json(PRICING_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { size, construction, safe: data.result };
  }

  function unitPrice(result) {
    return Number(result?.selling_price?.unit_price ?? result?.unit_price ?? NaN);
  }

  function productTotal(result) {
    return Number(result?.selling_price?.product_total ?? result?.product_total ?? NaN);
  }

  function gst(result) {
    return Number(result?.selling_price?.gst_amount ?? result?.gst_amount ?? NaN);
  }

  function grandTotal(result) {
    return Number(result?.selling_price?.grand_total ?? result?.grand_total ?? NaN);
  }

  function safeBuildTrace(size, construction, result, qty, print, zip) {
    const rows = $('buildRows');
    if (!rows) return;
    const price = unitPrice(result);
    rows.innerHTML = [
      ['Published size / bucket', `${safe(size.name)} · Bucket ${safe(size.pricing_bucket)}`, '—'],
      ['Production route', safe(size.route || 'Published rule'), '—'],
      ['Construction', safe(construction.name), '—'],
      ['Printing', safe(print), '—'],
      ['Feature selection', zip === 'Yes' ? 'Zipper / configured feature included' : 'No zipper feature', '—'],
      ['Quantity', Number(qty).toLocaleString(), '—'],
      ['Published selling price', 'Pricing v5 engine', money(price)],
    ].map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    if ($('buildCost')) $('buildCost').textContent = 'Internal costing remains protected in authenticated Admin';
    if ($('buildSell')) $('buildSell').textContent = money(price);
  }

  async function calcDashboardLive() {
    const msg = $('dashMsg');
    try {
      if (msg) msg.innerHTML = '<div class="notice info">Calculating from published Pricing v5…</div>';
      const dSize = $('dSize'), dStruct = $('dStruct'), dQty = $('dQty'), dPrint = $('dPrint'), dZip = $('dZip');
      const { size, construction, safe: result } = await livePrice(dSize, dStruct, dQty, dPrint, dZip);
      const price = unitPrice(result);
      if ($('dashPrice')) $('dashPrice').textContent = money(price);
      if ($('impactOld')) $('impactOld').textContent = money(price);
      if ($('impactNew')) $('impactNew').textContent = 'Re-test after edit';
      if ($('impactDelta')) $('impactDelta').textContent = '—';
      if ($('dashMarket')) $('dashMarket').textContent = 'Exact evidence only';
      if ($('dashPos')) $('dashPos').textContent = 'See Competitor Evaluator';
      if ($('dashGuru')) $('dashGuru').textContent = `Published v5 price for ${size.name}, ${construction.name}, ${Number(dQty.value || 0).toLocaleString()} pcs. SETU will only calculate a market average when exact comparable evidence exists.`;
      safeBuildTrace(size, construction, result, dQty.value, dPrint.value, dZip.value);
      if (msg) {
        const route = String(size.route || '').toLowerCase();
        const bottom = String(size.bottom_registration_mode || '').toLowerCase();
        msg.innerHTML = route === 'conditional' || bottom.includes('conditional')
          ? '<div class="notice warn"><b>Special bottom rule:</b> Sales must choose the applicable bottom artwork route before final pricing.</div>'
          : route.includes('separate')
            ? '<div class="notice info"><b>Automatic split-gusset route:</b> SETU prices the approved production route without adding an unnecessary Sales question.</div>'
            : '<div class="notice good"><b>Live v5 result:</b> price recalculated from the published engine.</div>';
      }
    } catch (error) {
      if (msg) msg.innerHTML = `<div class="notice block"><b>Pricing unavailable:</b> ${safe(error.message)}</div>`;
    }
  }

  async function liveMatrix(scope = 'all') {
    const msg = $('matrixMsg');
    const tbody = $('matrixRows');
    if (!tbody) return;
    try {
      if (msg) msg.textContent = 'Loading published v5 matrix…';
      const construction = apiConstructionFor($('mStruct'));
      if (!construction) throw new Error('No published construction selected');
      const body = {
        matrix: true,
        construction_id: construction.id,
        print: $('mPrint')?.value === 'CMYK' ? 'CMYK' : 'CMYKW',
        selected_charge_codes: selectedChargeCodes($('mZip')),
      };
      const data = await json(PRICING_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const selected = apiSizeFor($('mSize'));
      const selectedBucket = selected?.pricing_bucket;
      let rows = data.rows || [];
      if (scope === 'size' && selected) rows = rows.filter((r) => r.size_profile_id === selected.id);
      if (scope === 'bucket' && selectedBucket != null) rows = rows.filter((r) => Number(r.pricing_bucket) === Number(selectedBucket));
      tbody.innerHTML = rows.flatMap((row) => (row.prices || []).map((point) => {
        const q = Number(point.quantity || 0);
        const localBand = typeof bandFor === 'function' ? bandFor(Number(row.pricing_bucket), q) : null;
        return `<tr><td>${safe(row.size_name)}</td><td>${safe(row.pricing_bucket)}</td><td>${q.toLocaleString()}</td><td>${localBand ? safe(localBand[1]) + '%' : 'Published'}</td><td>${localBand ? '₹' + safe(localBand[2]) : 'Published'}</td><td><b>${point.ok ? money(point.unit_price) : 'Blocked'}</b></td><td>—</td><td><span class="pill blue">Live v5</span></td><td>Review sample</td><td><span class="pill ${point.ok ? 'green' : 'red'}">${point.ok ? 'Ready' : 'Blocked'}</span></td></tr>`;
      })).join('');
      if (msg) msg.innerHTML = `<b>${scope === 'all' ? 'All published SUP sizes' : scope === 'bucket' ? `Bucket ${safe(selectedBucket)}` : safe(selected?.name)}:</b> ${rows.length} size rows recalculated from Pricing v5.`;
    } catch (error) {
      if (msg) msg.innerHTML = `<span class="red">${safe(error.message)}</span>`;
    }
  }

  async function salesChangedLive() {
    const box = $('betterOptions');
    try {
      const d = await livePrice($('sSize'), $('sStruct'), $('sQty'), $('sPrint'), $('sZip'));
      const currentQty = Math.max(1, Number($('sQty')?.value) || 5000);
      const current = unitPrice(d.safe);
      const total = productTotal(d.safe);
      const tax = gst(d.safe);
      const grand = grandTotal(d.safe);
      if ($('sUnit')) $('sUnit').textContent = `${money(current)}/pc`;
      if ($('sTotal')) $('sTotal').textContent = Number.isFinite(total) ? `₹${Math.round(total).toLocaleString()}` : money(current * currentQty);
      if ($('sGst')) $('sGst').textContent = Number.isFinite(tax) ? `₹${Math.round(tax).toLocaleString()}` : '—';
      if ($('sGrand')) $('sGrand').textContent = Number.isFinite(grand) ? `₹${Math.round(grand).toLocaleString()}` : '—';
      if ($('qTotal')) $('qTotal').textContent = Number.isFinite(grand) ? `₹${Math.round(grand).toLocaleString()}` : '—';
      const size = d.size;
      if ($('salesRule')) {
        const route = String(size.route || '').toLowerCase();
        $('salesRule').innerHTML = route === 'conditional'
          ? '<div class="notice warn"><b>Bottom artwork?</b> This size requires the approved conditional route answer before final pricing.</div>'
          : route.includes('separate')
            ? '<div class="notice info"><b>Automatic split gusset.</b> SETU handles the approved production route without another Sales question.</div>'
            : '<div class="notice good"><b>Valid published configuration.</b> No extra bottom question is required.</div>';
      }
      const engineOptions = Array.isArray(d.safe?.alternative_quantities) ? d.safe.alternative_quantities : [];
      const results = engineOptions.map((row) => ({ qty:Number(row.quantity), price:Number(row.unit_price), total:Number(row.product_total) }))
        .filter((row) => Number.isFinite(row.qty) && Number.isFinite(row.price));
      const better = results.filter((r) => r.qty > currentQty && Number.isFinite(r.price) && r.price < current);
      const recommended = better.find((r) => (current - r.price) / current >= 0.05) || better[0];
      if (box) {
        box.innerHTML = results.map((r) => {
          const saving = Number.isFinite(current) && current > 0 ? ((current - r.price) / current) * 100 : 0;
          const rec = recommended && r.qty === recommended.qty;
          return `<div class="alt"${rec ? ' style="border-color:#46bfae;background:#eefbf8"' : ''}><div><b>${r.qty.toLocaleString()} pcs</b>${rec ? '<div><span class="pill green">Recommended MOQ</span></div>' : ''}<div style="font-size:11px;color:var(--m)">${r.qty === currentQty ? 'Current selection' : saving > 0 ? `Unit price saves ${saving.toFixed(1)}%` : 'No unit saving'}</div></div><div style="text-align:right"><b>${money(r.price)}/pc</b><div style="font-size:11px;color:var(--m)">${money(Number.isFinite(r.total)?r.total:r.price*r.qty)} excl GST</div></div></div>`;
        }).join('');
        if (recommended) box.innerHTML += `<div class="notice good"><b>SETU suggestion:</b> offer ${recommended.qty.toLocaleString()} pcs as an option to reduce unit price from ${money(current)} to ${money(recommended.price)} (${(((current - recommended.price) / current) * 100).toFixed(1)}% lower). SETU never changes the customer's quantity automatically.</div>`;
      }
    } catch (error) {
      if (box) box.innerHTML = `<div class="notice block"><b>Live pricing unavailable:</b> ${safe(error.message)}</div>`;
    }
  }

  async function competitorLive() {
    try {
      const d = await livePrice($('cSize'), $('cStruct'), $('cQty'), { value: 'CMYKW' }, { value: 'Yes' });
      if ($('cStark')) $('cStark').value = unitPrice(d.safe).toFixed(2);
    } catch (_) {}
    if (typeof window.renderCompetitors === 'function') window.renderCompetitors();
  }

  function kldFileFor(index) {
    if (typeof sizes === 'undefined' || !sizes[index]) return null;
    const size = String(sizes[index][0]).replace(/×/g, 'x').replace(/\s/g, '');
    const gusset = String(sizes[index][1]).replace(/\+/g, '-').replace(/\s/g, '');
    return `/kld/pricing-v5/sup/${size}-bg-${gusset}.svg`;
  }

  function kldStateLabel(index) {
    const status = state.kld[index];
    if (status === 'approved') return '<span class="pill green">Sample approved</span>';
    if (status === 'change') return '<span class="pill red">Needs change</span>';
    return '<span class="pill blue">Review sample</span>';
  }

  function openKld(index) {
    const file = kldFileFor(index);
    if (!file) return;
    const title = typeof sizes !== 'undefined' && sizes[index] ? `${sizes[index][0]} mm` : 'KLD';
    if ($('drawerTitle')) $('drawerTitle').textContent = `KLD Review · ${title}`;
    if ($('drawerBody')) $('drawerBody').innerHTML = `
      <div class="notice warn"><b>SETU-generated engineering review sample — not a production dieline.</b> Approve the layout/size logic now; Stark's final production KLD can replace this sample later.</div>
      <div style="margin-top:12px;border:1px solid var(--l);border-radius:12px;background:#fff;padding:10px;text-align:center"><img src="${file}" alt="${safe(title)} KLD review sample" style="max-width:100%;max-height:520px"></div>
      <div class="row wrap" style="margin-top:12px"><a class="btn pri" href="${file}" target="_blank" rel="noopener" style="text-decoration:none">Open full KLD</a><button class="btn success" onclick="pricingV5Review.approveKld(${index})">Approve sample</button><button class="btn soft" onclick="pricingV5Review.changeKld(${index})">Needs Change</button></div>
      <label style="display:block;margin-top:12px"><span>Change/comment</span><textarea id="kldComment" class="input" rows="4" placeholder="Tell SETU what needs to change: size, gusset, zipper, safe area, trim, fold line, or other."></textarea></label>`;
    $('shade')?.classList.add('on');
    $('drawer')?.classList.add('open');
  }

  async function approveKld(index) {
    state.kld[index] = 'approved';
    await feedback(`kld-${index + 1}`, `Approved SETU engineering review sample for ${sizes[index][0]} mm. Final production KLD may replace this sample later.`);
    enhanceKldRows();
    if (typeof window.closeDrawer === 'function') window.closeDrawer();
  }

  async function changeKld(index) {
    const comment = $('kldComment')?.value?.trim() || 'KLD sample needs changes.';
    state.kld[index] = 'change';
    await feedback(`kld-${index + 1}`, `Needs change for ${sizes[index][0]} mm KLD: ${comment}`, 'Needs change', 'important');
    enhanceKldRows();
    if (typeof window.closeDrawer === 'function') window.closeDrawer();
  }

  async function approveAllKlds() {
    if (!confirm('Approve all 20 SETU engineering review KLD samples? This approves the review layout/size logic only; these are not production dielines.')) return;
    for (let i = 0; i < sizes.length; i += 1) state.kld[i] = 'approved';
    enhanceKldRows();
    await feedback('kld-all-20', 'Approved all 20 SETU engineering review KLD samples. Final Stark production KLDs can replace these review samples later.');
  }

  function enhanceKldRows() {
    const tbody = $('sizeRows');
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll('tr')];
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) return;
      cells[6].innerHTML = `${kldStateLabel(index)} <button class="btn soft" style="margin-left:6px;padding:5px 8px" onclick="pricingV5Review.openKld(${index})">Preview</button>`;
    });
    const page = document.querySelector('[data-page="sizes"] .head');
    if (page && !page.querySelector('[data-kld-approve-all]')) {
      const button = document.createElement('button');
      button.className = 'btn success';
      button.dataset.kldApproveAll = '1';
      button.textContent = 'Approve All 20 KLD Samples';
      button.onclick = approveAllKlds;
      page.appendChild(button);
    }
  }

  function familyKey(title) {
    const t = norm(title);
    if (t.includes('flatbottom')) return 'flat_bottom';
    if (t.includes('centersealroll')) return 'center_seal_roll';
    if (t.includes('centersealpouch')) return 'center_seal_pouch';
    if (t.includes('3sidesealroll')) return 'three_side_seal_roll';
    if (t.includes('3sidesealpouch')) return 'three_side_seal_pouch';
    if (t.includes('labels')) return 'labels';
    if (t.includes('shrinksleeves')) return 'shrink_sleeves';
    return null;
  }

  function familyRateHead(template) {
    return (template?.quantities || []).map((q, i) => `<th>${q ? Number(q).toLocaleString() : `Q${i + 1}`}</th>`).join('');
  }

  function familyRows(template) {
    if (!template?.rows?.length) return '<tr><td colspan="9">No published matrix rows.</td></tr>';
    return template.rows.map((row) => `<tr><td>${safe(row.width_mm)} × ${safe(row.height_mm)}</td><td>${safe(row.construction_key || 'Standard')}</td>${(row.rates || []).map((rate) => `<td>${money(rate)}</td>`).join('')}</tr>`).join('');
  }

  function openFamilyReview(key) {
    const item = state.families?.families?.[key];
    if (!item) return;
    if ($('drawerTitle')) $('drawerTitle').textContent = item.name;
    if (!$('drawerBody')) return;
    if (!item.template) {
      $('drawerBody').innerHTML = `
        <div class="notice warn"><b>Pricing configuration required.</b> ${safe(item.clarification)}</div>
        <div class="card" style="box-shadow:none;margin-top:12px"><div class="body"><b>Clarification needed from Akshay</b><p style="font-size:12px;color:var(--m)">Please confirm approved sizes, constructions/material structure, geometry/routing, quantity bands and commercial rules for this family.</p><textarea id="familyClarification" class="input" rows="6" placeholder="Enter Stark's approved setup or what needs to be added..."></textarea><button class="btn teal" style="margin-top:10px" onclick="pricingV5Review.saveFamilyClarification('${key}')">Save clarification</button></div></div>`;
    } else {
      const template = item.template;
      $('drawerBody').innerHTML = `
        <div class="notice info"><b>Current published baseline:</b> ${safe(template.name)} · ${safe(template.row_count)} matrix rows. ${safe(item.clarification)}</div>
        <div class="scroll" style="margin-top:12px;max-height:520px"><table><thead><tr><th>Size</th><th>Construction</th>${familyRateHead(template)}</tr></thead><tbody>${familyRows(template)}</tbody></table></div>
        <div class="notice warn"><b>Approval meaning:</b> Akshay is reviewing the current Stark workbook/matrix baseline as the migration starting point. This does not claim that the family is already using the detailed SUP v5 formula engine.</div>
        <label style="display:block;margin-top:10px"><span>Comment / required change</span><textarea id="familyComment" class="input" rows="4" placeholder="Add pricing or geometry changes needed before v5 migration..."></textarea></label>
        <div class="row wrap" style="margin-top:10px"><button class="btn success" onclick="pricingV5Review.approveFamily('${key}')">Approve current baseline for migration</button><button class="btn soft" onclick="pricingV5Review.changeFamily('${key}')">Needs Change</button></div>`;
    }
    $('shade')?.classList.add('on');
    $('drawer')?.classList.add('open');
  }

  async function approveFamily(key) {
    const item = state.families?.families?.[key];
    if (!item) return;
    await feedback(`family-${key}`, `Approved current ${item.name} published workbook/matrix baseline for Pricing v5 migration review.`);
    markFamilyCard(key, 'Approved');
    if (typeof window.closeDrawer === 'function') window.closeDrawer();
  }

  async function changeFamily(key) {
    const item = state.families?.families?.[key];
    const comment = $('familyComment')?.value?.trim() || 'Pricing/geometry changes required.';
    await feedback(`family-${key}`, `Needs change for ${item?.name || key}: ${comment}`, 'Needs change', 'important');
    markFamilyCard(key, 'Needs change');
    if (typeof window.closeDrawer === 'function') window.closeDrawer();
  }

  async function saveFamilyClarification(key) {
    const item = state.families?.families?.[key];
    const comment = $('familyClarification')?.value?.trim();
    if (!comment) return alert('Please enter the Stark pricing/geometry clarification first.');
    await feedback(`family-clarification-${key}`, `${item?.name || key}: ${comment}`, 'Clarified');
    markFamilyCard(key, 'Clarified');
    if (typeof window.closeDrawer === 'function') window.closeDrawer();
  }

  function markFamilyCard(key, status) {
    document.querySelectorAll('[data-page="families"] .family').forEach((card) => {
      const heading = card.querySelector('h3,h2,b')?.textContent || card.textContent || '';
      if (familyKey(heading) !== key) return;
      const pill = card.querySelector('.pill');
      if (pill) {
        pill.textContent = status;
        pill.classList.remove('amber', 'green', 'red');
        pill.classList.add(status === 'Approved' || status === 'Clarified' ? 'green' : 'red');
      }
    });
  }

  function wireFamilyCards() {
    document.querySelectorAll('[data-page="families"] .family').forEach((card) => {
      const heading = card.querySelector('h3,h2,b')?.textContent || card.textContent || '';
      const key = familyKey(heading);
      if (!key) return;
      const pill = card.querySelector('.pill');
      if (!pill) return;
      pill.style.cursor = 'pointer';
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      pill.title = 'Open the current Stark pricing baseline for review';
      pill.onclick = () => openFamilyReview(key);
      pill.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') openFamilyReview(key); };
    });
  }

  const clarificationItems = [
    ['invalid-combinations', 'Are any size × construction combinations not manufacturable?', 'If yes, identify them so SETU hides them instead of allowing an invalid quote.', ['All 44 apply to all 20 SUP sizes', 'Restrictions exist — see comment']],
    ['missing-kld-policy', 'What should Sales do when production KLD is not yet approved?', 'Review samples are available, but production dielines may arrive later.', ['Allow quote + show Production KLD pending', 'Allow quote using review sample reference', 'Block quote until production KLD']],
    ['competitor-directional', 'How should directional competitor evidence be handled?', 'Exact like-for-like evidence can be averaged. Directional evidence should never silently become an exact market average.', ['Show directional but exclude from average', 'Show exact evidence only']],
    ['construction-complete', 'Are the 44 standard SUP constructions complete?', '11 construction families × PE60/75/95/120 are currently configured.', ['Yes — complete', 'No — additions required']],
    ['other-family-geometry', 'Confirm family-specific geometry for Flat Bottom / Center Seal / 3SS.', 'Current Center Seal and 3SS workbook baselines can be reviewed now. Flat Bottom has no configured pricing; none of these families should inherit SUP geometry.', ['I will provide/confirm family-specific geometry', 'Use current workbook baselines as migration starting point']],
  ];

  const approvalItems = [
    'Approve all 20 Stand-Up sizes and bucket assignments.',
    'Approve all 5 wastage/margin bucket tables from the workbook.',
    'Approve all 44 standard SUP constructions.',
    'Approve the 110 × 170 conditional bottom-artwork production rule.',
    'Approve 260 × 340 and 280 × 360 automatic split-gusset routing.',
    'Approve separate 3-layer vs 4-layer foil costing rules.',
    'Approve the owner-only Custom Construction Lab workflow.',
    'Approve the Owner Pricing Dashboard and protected internal-cost behavior.',
    'Approve the Sales Quote flow, valid-option filtering, live repricing and better-MOQ suggestions.',
    'Approve competitor evidence policy: exact like-for-like evidence only in calculated market averages.',
    'Approve Draft → Test → Impact → Publish, with issued quote snapshots remaining unchanged.',
    'Approve the SETU engineering-review KLD workflow; final production KLDs may replace review samples later.',
    'Approve current Center Seal workbook/matrix baseline as the migration starting point, subject to Roll/Pouch geometry clarification.',
    'Approve current 3 Side Seal Roll Form workbook/matrix baseline as the migration starting point.',
    'Approve current 3 Side Seal Pouch Form workbook/matrix baseline as the migration starting point.',
    'Approve Flat Bottom as data-needed: SETU must not invent pricing until Stark supplies/approves its geometry and pricing rules.',
  ];

  async function saveClarification(index) {
    const select = $(`clarifySelect${index}`);
    const comment = $(`clarifyComment${index}`)?.value?.trim();
    const answer = select?.value || '';
    if (!answer) return alert('Select an answer before saving.');
    const text = `${clarificationItems[index][1]} Answer: ${answer}.${comment ? ` Comment: ${comment}` : ''}`;
    state.clarifications[index] = true;
    await feedback(`clarification-${clarificationItems[index][0]}`, text, 'Clarified');
    const status = $(`clarifyStatus${index}`);
    if (status) status.textContent = 'Saved';
  }

  async function approveBusiness(index, status) {
    state.approvals[index] = status;
    await feedback(`business-approval-${index + 1}`, `${status}: ${approvalItems[index]}`, status, status === 'Approved' ? 'normal' : 'important');
    const node = $(`businessStatus${index}`);
    if (node) node.textContent = status;
    updateApprovalProgress();
  }

  async function approveAllBusiness() {
    if (!confirm('Approve all business approval items? Clarification questions will NOT be auto-answered.')) return;
    approvalItems.forEach((_, index) => { state.approvals[index] = 'Approved'; const node = $(`businessStatus${index}`); if (node) node.textContent = 'Approved'; });
    updateApprovalProgress();
    await feedback('business-approvals-all', `Approved all ${approvalItems.length} business approval items. Clarifications remain separate and must be answered independently.`);
  }

  function updateApprovalProgress() {
    const approved = Object.values(state.approvals).filter((v) => v === 'Approved').length;
    const changed = Object.values(state.approvals).filter((v) => v === 'Needs change').length;
    const kldApproved = Object.values(state.kld).filter((v) => v === 'approved').length;
    const clarifications = Object.keys(state.clarifications).length;
    const status = $('approvalProgress');
    if (status) status.innerHTML = `<b>Business approvals:</b> ${approved}/${approvalItems.length} approved${changed ? ` · ${changed} need change` : ''} &nbsp; <b>KLD samples:</b> ${kldApproved}/20 approved &nbsp; <b>Clarifications:</b> ${clarifications}/${clarificationItems.length} answered`;
  }

  function renderSeparatedApproval() {
    const host = $('approvalList');
    if (!host) return;
    host.innerHTML = `
      <div class="notice warn"><b>Clarifications needed — answers, not approvals.</b> These items require Akshay to provide or confirm information before activation.</div>
      <div style="margin-top:12px">${clarificationItems.map((item, index) => `<div class="question"><div><b>C${index + 1}. ${safe(item[1])}</b><div style="font-size:11px;color:var(--m);margin:4px 0 8px">${safe(item[2])}</div><div class="grid2"><select id="clarifySelect${index}" class="input"><option value="">Select answer…</option>${item[3].map((option) => `<option>${safe(option)}</option>`).join('')}</select><input id="clarifyComment${index}" class="input" placeholder="Optional comment / detail"></div><div class="row" style="margin-top:8px"><button class="btn teal" onclick="pricingV5Review.saveClarification(${index})">Save clarification</button><span id="clarifyStatus${index}" style="font-size:11px;color:var(--m)">Awaiting answer</span></div></div></div>`).join('')}</div>
      <div class="notice good" style="margin-top:16px"><div class="row space wrap"><div><b>Business approvals</b><div style="font-size:11px">Approve each item or approve all. This never answers the clarification questions above.</div></div><button class="btn success" onclick="pricingV5Review.approveAllBusiness()">Approve All Business Items</button></div></div>
      <div style="margin-top:12px">${approvalItems.map((item, index) => `<div class="question"><div class="row space wrap"><div><b>A${index + 1}. ${safe(item)}</b><div id="businessStatus${index}" style="font-size:11px;color:var(--m);margin-top:4px">Awaiting Akshay</div></div><div class="row"><button class="btn success" onclick="pricingV5Review.approveBusiness(${index},'Approved')">Approve</button><button class="btn soft" onclick="pricingV5Review.approveBusiness(${index},'Needs change')">Needs Change</button></div></div></div>`).join('')}</div>
      <div id="approvalProgress" class="notice info" style="margin-top:14px"></div>`;
    updateApprovalProgress();
  }

  function attachLiveListeners() {
    ['dSize','dStruct','dQty','dPrint','dZip'].forEach((id) => $(id)?.addEventListener('change', calcDashboardLive));
    ['cSize','cStruct','cQty'].forEach((id) => $(id)?.addEventListener('change', competitorLive));
    ['sSize','sStruct','sQty','sPrint','sZip'].forEach((id) => $(id)?.addEventListener('change', salesChangedLive));
  }

  async function bootstrap() {
    try { state.catalog = await json(PRICING_API); } catch (_) {}
    try { state.families = await json(FAMILY_API); } catch (_) {}

    window.calcDashboard = calcDashboardLive;
    window.buildMatrix = liveMatrix;
    window.salesChanged = salesChangedLive;

    const originalRenderSizes = window.renderSizes;
    window.renderSizes = function wrappedRenderSizes() {
      if (typeof originalRenderSizes === 'function') originalRenderSizes();
      enhanceKldRows();
    };

    enhanceKldRows();
    wireFamilyCards();
    renderSeparatedApproval();
    attachLiveListeners();
    await calcDashboardLive();
    await salesChangedLive();
    await competitorLive();
  }

  window.pricingV5Review = {
    openKld,
    approveKld,
    changeKld,
    approveAllKlds,
    openFamilyReview,
    approveFamily,
    changeFamily,
    saveFamilyClarification,
    saveClarification,
    approveBusiness,
    approveAllBusiness,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})();
