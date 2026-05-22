// ── CONFIG ─────────────────────────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-20250514";

async function callClaude(messages, systemPrompt, imageBase64 = null, mediaType = null) {
  const apiKey = state.settings.apiKey;
  if (!apiKey) { showApiKeyPrompt(); throw new Error("No API key"); }

  const userContent = [];
  if (imageBase64) {
    userContent.push({ type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } });
  }
  if (typeof messages === "string") {
    userContent.push({ type: "text", text: messages });
  }

  const body = {
    model: MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }]
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "API error");
  }
  const data = await res.json();
  return data.content[0].text;
}

function extractJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch(e) {}
  return null;
}

// ── STATE ──────────────────────────────────────────────────────────────────

const DEFAULT_WARDROBE = [
  { id: 'w1', name: 'Linen blazer', category: 'outerwear', occasions: ['work','smart'], weather: ['mild','warm'], colour: 'Cream', pairs_with: ['navy','white','beige'], emoji: '🧥', bg: '#EEEDFE', wearCount: 3, lastWorn: 2 },
  { id: 'w2', name: 'Silk blouse', category: 'top', occasions: ['work','smart'], weather: ['warm','mild'], colour: 'Pale pink', pairs_with: ['neutrals','navy','white'], emoji: '👚', bg: '#FBEAF0', wearCount: 1, lastWorn: 5 },
  { id: 'w3', name: 'Wide-leg jeans', category: 'bottom', occasions: ['casual','weekend'], weather: ['mild','cool'], colour: 'Indigo', pairs_with: ['white','cream','stripes'], emoji: '👖', bg: '#E6F1FB', wearCount: 0, lastWorn: 35 },
  { id: 'w4', name: 'Floral midi dress', category: 'dress', occasions: ['weekend','smart'], weather: ['warm'], colour: 'Multi', pairs_with: ['white','nude','tan'], emoji: '👗', bg: '#FAECE7', wearCount: 2, lastWorn: 4 },
  { id: 'w5', name: 'Wrap dress', category: 'dress', occasions: ['work','smart'], weather: ['mild','cool'], colour: 'Burgundy', pairs_with: ['black','tan','gold'], emoji: '👗', bg: '#E1F5EE', wearCount: 2, lastWorn: 3 },
  { id: 'w6', name: 'Linen trousers', category: 'bottom', occasions: ['work','smart','casual'], weather: ['warm','mild'], colour: 'Sand', pairs_with: ['white','navy','coral'], emoji: '👖', bg: '#FAEEDA', wearCount: 4, lastWorn: 1 },
  { id: 'w7', name: 'White sneakers', category: 'shoes', occasions: ['casual','weekend'], weather: ['any'], colour: 'White', pairs_with: ['everything'], emoji: '👟', bg: '#F1EFE8', wearCount: 8, lastWorn: 0 },
  { id: 'w8', name: 'Strappy sandals', category: 'shoes', occasions: ['weekend','evening','smart'], weather: ['warm'], colour: 'Tan', pairs_with: ['dresses','linen','white'], emoji: '👡', bg: '#FBEAF0', wearCount: 1, lastWorn: 6 },
  { id: 'w9', name: 'Black bodysuit', category: 'top', occasions: ['evening','smart','casual'], weather: ['any'], colour: 'Black', pairs_with: ['everything'], emoji: '🩱', bg: '#E6F1FB', wearCount: 0, lastWorn: 999 },
  { id: 'w10', name: 'Denim jacket', category: 'outerwear', occasions: ['casual','weekend'], weather: ['cool','mild'], colour: 'Blue', pairs_with: ['white','floral','stripes'], emoji: '🧥', bg: '#EEEDFE', wearCount: 3, lastWorn: 7 },
  { id: 'w11', name: 'Tailored skirt', category: 'bottom', occasions: ['work','smart'], weather: ['mild','warm'], colour: 'Charcoal', pairs_with: ['white','silk','blouse'], emoji: '👗', bg: '#F1EFE8', wearCount: 2, lastWorn: 8 },
  { id: 'w12', name: 'Ankle boots', category: 'shoes', occasions: ['work','smart','casual'], weather: ['cool','mild'], colour: 'Camel', pairs_with: ['jeans','dresses','trousers'], emoji: '👢', bg: '#FAEEDA', wearCount: 5, lastWorn: 2 },
];

const OUTFIT_TEMPLATES = [
  { itemIds: ['w1','w6','w7'], occasion: 'work', weather: '71°F · Sunny', locked: true, aiPicked: false },
  { itemIds: ['w2','w11','w8'], occasion: 'work', weather: '65°F · Cloudy', locked: false, aiPicked: false },
  { itemIds: ['w10','w3','w7'], occasion: 'casual', weather: '68°F · Sunny', locked: false, aiPicked: false },
  { itemIds: ['w5','w12'], occasion: 'smart', weather: '59°F · Rainy', locked: false, aiPicked: false },
  { itemIds: ['w6','w2','w7'], occasion: 'smart', weather: '74°F · Sunny', locked: false, aiPicked: false },
  { itemIds: ['w4','w8'], occasion: 'weekend', weather: '78°F · Sunny', locked: false, aiPicked: false },
  null
];

let state = {
  wardrobe: JSON.parse(localStorage.getItem('wardrobe') || 'null') || DEFAULT_WARDROBE,
  outfits: JSON.parse(localStorage.getItem('outfits') || 'null') || OUTFIT_TEMPLATES,
  styleProfile: JSON.parse(localStorage.getItem('styleProfile') || 'null'),
  settings: JSON.parse(localStorage.getItem('settings') || 'null') || {
    apiKey: '',
    dayVibes: ['work','work','smart','work','smart','casual','casual'],
    customRules: ['No jeans on Fridays', 'Dresses on warm days only'],
    cooldown: 5,
    rotateEvenly: true,
    weatherAware: true,
    calendarAware: true,
    lockApproved: true,
    planOnSunday: false,
    reminderEnabled: true,
    reminderTime: '7:30 am'
  },
  activeFilter: 'all',
  addStep: 1,
  pendingItem: null,
  uploadedPhoto: null,
  profileStep: 'upload',
};

function save() {
  localStorage.setItem('wardrobe', JSON.stringify(state.wardrobe));
  localStorage.setItem('outfits', JSON.stringify(state.outfits));
  localStorage.setItem('settings', JSON.stringify(state.settings));
  localStorage.setItem('styleProfile', JSON.stringify(state.styleProfile));
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────

function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenId);
  if (screen) screen.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (btn) btn.classList.add('active');
  if (screenId === 'add') { state.addStep = 1; renderAddStep(); }
  if (screenId === 'wardrobe') renderWardrobe();
  if (screenId === 'calendar') renderCalendar();
  if (screenId === 'settings') renderSettings();
  if (screenId === 'profile') renderProfileScreen();
}

document.querySelectorAll('[data-screen]').forEach(el => {
  el.addEventListener('click', () => navigateTo(el.dataset.screen));
});

// ── API KEY PROMPT ──────────────────────────────────────────────────────────

function showApiKeyPrompt() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:32px;margin-bottom:10px;">🔑</div>
      <div style="font-family:var(--font-display);font-size:22px;margin-bottom:8px;">API key needed</div>
      <p style="font-size:13px;color:var(--text-2);line-height:1.6;">To use real AI features, paste your Claude API key below. It's stored only on this device.</p>
    </div>
    <div class="form-group" style="margin-bottom:14px;">
      <label class="form-label">Claude API key</label>
      <input class="form-input" id="api-key-input" placeholder="sk-ant-api03-..." type="password" style="font-size:13px;" />
    </div>
    <button class="btn-primary" style="width:100%;" id="save-api-key-btn">Save & continue</button>
    <p style="font-size:11px;color:var(--text-3);text-align:center;margin-top:10px;">Get a free key at console.anthropic.com</p>`;
  overlay.style.display = 'flex';
  document.getElementById('save-api-key-btn').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key.startsWith('sk-')) { alert('That doesn\'t look right — API keys start with sk-ant-...'); return; }
    state.settings.apiKey = key;
    save();
    closeModal();
  });
}

// ── STYLE PROFILE ──────────────────────────────────────────────────────────

function renderProfileScreen() {
  const body = document.getElementById('profile-body');
  if (!body) return;
  body.innerHTML = '';

  if (state.styleProfile) {
    renderProfileSummary(body);
  } else {
    renderProfileUpload(body);
  }
}

function renderProfileUpload(container) {
  container.innerHTML = `
    <div style="max-width:560px;">
      <div style="background:var(--purple-light);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;border:1px solid rgba(124,111,224,0.2);">
        <div style="font-size:13px;font-weight:500;color:var(--purple-dark);margin-bottom:6px;">✨ Build your style profile</div>
        <p style="font-size:12px;color:var(--text-2);line-height:1.6;">Upload one photo of yourself and Claude AI will analyse your body shape, colouring, and proportions to make every outfit suggestion personally flattering to you.</p>
      </div>
      <div style="display:flex;gap:20px;align-items:flex-start;">
        <div style="width:180px;flex-shrink:0;">
          <label class="upload-zone" for="profile-photo-upload" style="aspect-ratio:2/3;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:0.4;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style="font-size:12px;text-align:center;">Upload a photo<br/>of yourself</span>
          </label>
          <input type="file" id="profile-photo-upload" accept="image/*" style="display:none;" />
        </div>
        <div style="flex:1;padding-top:8px;">
          <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;font-weight:500;">Tips for best results:</p>
          <ul style="font-size:12px;color:var(--text-2);line-height:2;list-style:none;padding:0;">
            <li>✓ Full length photo showing head to toe</li>
            <li>✓ Wear fitted clothing so shape is visible</li>
            <li>✓ Stand in good lighting</li>
            <li>✓ Neutral background if possible</li>
          </ul>
          <p style="font-size:11px;color:var(--text-3);margin-top:14px;line-height:1.6;">Your photo is analysed by AI and then a text profile is saved on your device. The photo itself is never stored.</p>
        </div>
      </div>
      <div id="profile-loading" style="display:none;" class="loading-state">
        <div class="spinner"></div>
        <div style="font-weight:500;color:var(--purple);">Claude is building your style profile…</div>
        <div style="font-size:13px;color:var(--text-3);">Analysing body shape, colouring & proportions</div>
      </div>
    </div>`;

  document.getElementById('profile-photo-upload').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    const mediaType = file.type || 'image/jpeg';
    document.querySelector('.upload-zone').style.display = 'none';
    document.getElementById('profile-loading').style.display = 'flex';

    try {
      const result = await callClaude(
        "Please analyse this photo of a person and build a style profile. Focus on: body shape (e.g. hourglass, pear, apple, rectangle, inverted triangle), height impression, skin undertone (warm/cool/neutral), natural colouring (hair colour, eye colour if visible), and specific style recommendations including: best necklines, best sleeve lengths, best trouser/skirt cuts, hem lengths that will flatter, colour families that suit their colouring, patterns to embrace or avoid, and any other specific tips. Be warm, positive, and specific. Return ONLY a JSON object with these fields: { \"bodyShape\": \"\", \"heightImpression\": \"\", \"undertone\": \"\", \"colouring\": \"\", \"bestNecklines\": [], \"bestBottoms\": [], \"bestLengths\": [], \"colourPalette\": [], \"patternsToEmbrace\": [], \"patternsToAvoid\": [], \"keyTips\": [], \"summary\": \"\" }",
        "You are a professional personal stylist with expertise in body shape analysis and colour theory. Always be positive, empowering, and specific. Return only valid JSON.",
        base64.split(',')[1],
        mediaType
      );
      const profile = extractJSON(result);
      if (profile) {
        state.styleProfile = { ...profile, createdAt: new Date().toISOString() };
        save();
        renderProfileScreen();
      } else {
        throw new Error("Couldn't parse profile");
      }
    } catch(err) {
      document.getElementById('profile-loading').style.display = 'none';
      document.querySelector('.upload-zone').style.display = 'flex';
      alert('Something went wrong: ' + err.message + '. Please check your API key in Settings.');
    }
  });
}

function renderProfileSummary(container) {
  const p = state.styleProfile;
  container.innerHTML = `
    <div style="max-width:620px;display:flex;flex-direction:column;gap:14px;">
      <div style="background:var(--purple-light);border-radius:var(--radius);padding:16px 20px;border:1px solid rgba(124,111,224,0.2);">
        <div style="font-size:11px;font-weight:500;color:var(--purple);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Style summary</div>
        <p style="font-size:13px;color:var(--purple-dark);line-height:1.7;">${p.summary || 'Your personal style profile is ready.'}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Body shape</div>
          <div style="font-size:15px;font-weight:500;color:var(--text);">${p.bodyShape || '—'}</div>
          <div style="font-size:11px;color:var(--text-2);margin-top:4px;">${p.undertone ? p.undertone + ' undertone' : ''}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Colouring</div>
          <div style="font-size:15px;font-weight:500;color:var(--text);">${p.colouring || '—'}</div>
          <div style="font-size:11px;color:var(--text-2);margin-top:4px;">${p.heightImpression || ''}</div>
        </div>
      </div>
      ${p.colourPalette?.length ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Your colour palette</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.colourPalette.map(c => `<span style="font-size:11px;padding:4px 10px;border-radius:20px;background:var(--teal-light);color:var(--teal);border:1px solid rgba(29,158,117,0.2);">${c}</span>`).join('')}</div>
      </div>` : ''}
      ${p.keyTips?.length ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Key tips for you</div>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:6px;">${p.keyTips.map(t => `<li style="font-size:12px;color:var(--text-2);display:flex;gap:8px;"><span style="color:var(--purple);flex-shrink:0;">✓</span>${t}</li>`).join('')}</ul>
      </div>` : ''}
      <button class="btn-secondary" id="redo-profile-btn" style="align-self:flex-start;">Redo profile with new photo</button>
    </div>`;

  document.getElementById('redo-profile-btn').addEventListener('click', () => {
    state.styleProfile = null;
    save();
    renderProfileScreen();
  });
}

// ── AI OUTFIT PICKING ──────────────────────────────────────────────────────

async function aiPickOutfit(dayIndex) {
  const vibe = state.settings.dayVibes[dayIndex] || 'casual';
  const recentIds = state.wardrobe
    .filter(w => w.lastWorn <= state.settings.cooldown)
    .map(w => w.id);

  const wardrobeData = state.wardrobe.map(w => ({
    id: w.id, name: w.name, category: w.category,
    occasions: w.occasions, weather: w.weather,
    colour: w.colour, pairs_with: w.pairs_with,
    lastWorn: w.lastWorn, wearCount: w.wearCount
  }));

  const profileContext = state.styleProfile
    ? `Style profile: Body shape: ${state.styleProfile.bodyShape}. Colouring: ${state.styleProfile.colouring}. Undertone: ${state.styleProfile.undertone}. Best bottoms: ${state.styleProfile.bestBottoms?.join(', ')}. Best necklines: ${state.styleProfile.bestNecklines?.join(', ')}. Colour palette: ${state.styleProfile.colourPalette?.join(', ')}. Key tips: ${state.styleProfile.keyTips?.join('. ')}.`
    : 'No style profile set up yet.';

  const prompt = `You are a personal stylist. Pick an outfit from the wardrobe below.

Day vibe: ${vibe}
Custom rules: ${state.settings.customRules.join('; ') || 'None'}
Avoid repeating these item IDs (worn recently): ${recentIds.join(', ') || 'None'}
${state.settings.rotateEvenly ? 'Prefer items with lower wearCount.' : ''}

${profileContext}

Wardrobe: ${JSON.stringify(wardrobeData)}

Return ONLY a JSON object: { "itemIds": ["id1", "id2", "id3"], "occasion": "work|smart|casual|weekend|evening", "reasoning": "one sentence why this works for her specifically" }

Pick 2-3 items that work together. Always include shoes if available. Make sure items complement her style profile.`;

  const result = await callClaude(prompt, "You are an expert personal stylist. Return only valid JSON.");
  const picked = extractJSON(result);
  if (!picked || !picked.itemIds?.length) throw new Error("AI couldn't pick an outfit");
  return picked;
}

// ── CALENDAR ───────────────────────────────────────────────────────────────

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const VIBES_COLORS = {
  work: 'occ-work', smart: 'occ-smart', casual: 'occ-casual',
  weekend: 'occ-weekend', evening: 'occ-evening'
};

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function renderCalendar() {
  const dates = getWeekDates();
  const today = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  document.getElementById('week-label').textContent =
    `${fmt.format(dates[0])} – ${fmt.format(dates[6])}, ${dates[0].getFullYear()}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  dates.forEach((date, i) => {
    const isToday = date.toDateString() === today.toDateString();
    const outfit = state.outfits[i];
    const col = document.createElement('div');
    col.className = 'day-col' + (isToday ? ' today' : '');

    const numEl = isToday
      ? `<div class="day-number today-num">${date.getDate()}</div>`
      : `<div class="day-number">${date.getDate()}</div>`;

    col.innerHTML = `<div class="day-header"><div class="day-name">${DAYS[i]}</div>${numEl}</div>`;

    if (outfit === null) {
      const empty = document.createElement('div');
      empty.className = 'empty-day';
      const pickBtn = document.createElement('button');
      pickBtn.className = 'swap-btn';
      pickBtn.style.marginTop = '8px';
      pickBtn.textContent = state.settings.apiKey ? '✨ AI pick' : 'Picking soon…';
      if (state.settings.apiKey) {
        pickBtn.addEventListener('click', () => aiSwapOutfit(i, col));
      }
      empty.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg><span>No outfit yet</span>`;
      empty.appendChild(pickBtn);
      col.appendChild(empty);
    } else {
      const items = outfit.itemIds.map(id => state.wardrobe.find(w => w.id === id)).filter(Boolean);
      const primary = items[0];
      if (!primary) return;

      const card = document.createElement('div');
      card.className = 'outfit-card';
      const occClass = VIBES_COLORS[outfit.occasion] || 'occ-casual';
      const occasionLabel = outfit.occasion.charAt(0).toUpperCase() + outfit.occasion.slice(1);
      const aiTag = outfit.aiPicked ? `<span style="font-size:9px;color:var(--purple);margin-left:4px;">✨ AI</span>` : '';

      card.innerHTML = `
        <div class="outfit-thumb" style="background:${primary.bg}">${primary.emoji}</div>
        <div class="outfit-card-body">
          <span class="outfit-occasion ${occClass}">${occasionLabel}</span>${aiTag}
          <div class="outfit-name">${primary.name}</div>
          <div class="outfit-sub">${items.slice(1).map(it => it.name).join(' + ')}</div>
          <div class="outfit-weather">☀ ${outfit.weather}</div>
          ${outfit.reasoning ? `<div style="font-size:9px;color:var(--purple);margin-top:4px;line-height:1.4;font-style:italic;">${outfit.reasoning}</div>` : ''}
        </div>`;

      if (outfit.locked) {
        const lock = document.createElement('div');
        lock.style.cssText = 'padding:0 8px 8px;';
        lock.innerHTML = `<div class="locked-badge">🔒 Locked</div>`;
        card.appendChild(lock);
      } else {
        const swapWrap = document.createElement('div');
        swapWrap.style.cssText = 'padding:0 8px 8px;';
        const swapBtn = document.createElement('button');
        swapBtn.className = 'swap-btn';
        swapBtn.textContent = state.settings.apiKey ? '✨ AI swap' : 'Swap outfit';
        swapBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.settings.apiKey ? aiSwapOutfit(i, col) : swapOutfit(i);
        });
        swapWrap.appendChild(swapBtn);
        card.appendChild(swapWrap);
      }

      card.addEventListener('click', () => showOutfitModal(i));
      col.appendChild(card);
    }
    grid.appendChild(col);
  });
}

async function aiSwapOutfit(dayIndex, colEl) {
  const btn = colEl.querySelector('.swap-btn');
  if (btn) { btn.textContent = '⏳ Picking…'; btn.disabled = true; }
  try {
    const picked = await aiPickOutfit(dayIndex);
    state.outfits[dayIndex] = {
      itemIds: picked.itemIds,
      occasion: picked.occasion || 'casual',
      weather: state.outfits[dayIndex]?.weather || '70°F · Sunny',
      locked: false,
      aiPicked: true,
      reasoning: picked.reasoning || ''
    };
    save();
    renderCalendar();
  } catch(err) {
    if (btn) { btn.textContent = '✨ AI swap'; btn.disabled = false; }
    if (err.message !== 'No API key') alert('Could not pick outfit: ' + err.message);
  }
}

function swapOutfit(dayIndex) {
  const occasions = ['work','smart','casual','weekend','evening'];
  const occ = occasions[Math.floor(Math.random() * occasions.length)];
  const available = state.wardrobe.filter(w => !w.excluded);
  const shuffled = available.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 2);
  state.outfits[dayIndex] = {
    itemIds: picked.map(p => p.id),
    occasion: occ,
    weather: state.outfits[dayIndex]?.weather || '70°F · Sunny',
    locked: false, aiPicked: false
  };
  save();
  renderCalendar();
}

function showOutfitModal(dayIndex) {
  const outfit = state.outfits[dayIndex];
  if (!outfit) return;
  const items = outfit.itemIds.map(id => state.wardrobe.find(w => w.id === id)).filter(Boolean);
  const primary = items[0];
  if (!primary) return;

  const content = document.getElementById('modal-content');
  const occClass = VIBES_COLORS[outfit.occasion] || 'occ-casual';
  content.innerHTML = `
    <div class="modal-thumb" style="background:${primary.bg}">${primary.emoji}</div>
    <div class="modal-item-name">${items.map(i => i.name).join(' + ')}</div>
    ${outfit.reasoning ? `<div style="font-size:12px;color:var(--purple);font-style:italic;margin-bottom:12px;padding:10px 12px;background:var(--purple-light);border-radius:var(--radius-sm);">✨ ${outfit.reasoning}</div>` : ''}
    <div class="modal-meta-row"><span>Occasion</span><span class="modal-meta-val"><span class="outfit-occasion ${occClass}" style="padding:2px 8px;border-radius:20px;">${outfit.occasion}</span></span></div>
    <div class="modal-meta-row"><span>Weather</span><span class="modal-meta-val">${outfit.weather}</span></div>
    <div class="modal-meta-row"><span>Picked by</span><span class="modal-meta-val">${outfit.aiPicked ? '✨ Claude AI' : 'Random'}</span></div>
    <div class="modal-meta-row"><span>Status</span><span class="modal-meta-val">${outfit.locked ? '🔒 Locked' : 'Unlocked'}</span></div>
    <div class="modal-actions">
      <button class="btn-primary" style="flex:1;" id="modal-lock-btn">${outfit.locked ? 'Unlock' : 'Lock this outfit'}</button>
      ${!outfit.locked && state.settings.apiKey ? `<button class="btn-secondary" id="modal-swap-btn">✨ AI swap</button>` : ''}
    </div>`;

  document.getElementById('modal-lock-btn').addEventListener('click', () => {
    state.outfits[dayIndex].locked = !state.outfits[dayIndex].locked;
    save(); closeModal(); renderCalendar();
  });
  const swapBtn = document.getElementById('modal-swap-btn');
  if (swapBtn) swapBtn.addEventListener('click', () => {
    closeModal();
    const col = document.querySelectorAll('.day-col')[dayIndex];
    aiSwapOutfit(dayIndex, col);
  });
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ── WARDROBE ───────────────────────────────────────────────────────────────

const CATEGORIES = ['all','top','bottom','dress','outerwear','shoes','accessory'];

function renderWardrobe() {
  document.getElementById('wardrobe-count').textContent =
    `${state.wardrobe.length} item${state.wardrobe.length !== 1 ? 's' : ''}`;

  const filterBar = document.getElementById('filter-bar');
  filterBar.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const count = cat === 'all' ? state.wardrobe.length : state.wardrobe.filter(w => w.category === cat).length;
    if (cat !== 'all' && count === 0) return;
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (state.activeFilter === cat ? ' active' : '');
    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1) + ` (${count})`;
    btn.addEventListener('click', () => { state.activeFilter = cat; renderWardrobe(); });
    filterBar.appendChild(btn);
  });

  const search = document.getElementById('wardrobe-search').value.toLowerCase();
  const filtered = state.wardrobe.filter(item => {
    if (state.activeFilter !== 'all' && item.category !== state.activeFilter) return false;
    if (search && !item.name.toLowerCase().includes(search)) return false;
    return true;
  });

  const grid = document.getElementById('wardrobe-grid');
  grid.innerHTML = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'wardrobe-item';
    let wornText, wornColor, dotColor;
    if (item.lastWorn === 999) { wornText = 'Never worn'; wornColor = '#dc2626'; dotColor = '#dc2626'; }
    else if (item.lastWorn <= 7) { wornText = `Worn ${item.wearCount}× this month`; wornColor = '#555'; dotColor = '#1D9E75'; }
    else if (item.lastWorn <= 30) { wornText = `Not worn in ${item.lastWorn} days`; wornColor = '#BA7517'; dotColor = '#BA7517'; }
    else { wornText = 'Rarely worn'; wornColor = '#dc2626'; dotColor = '#dc2626'; }

    card.innerHTML = `
      <div class="item-thumb" style="background:${item.bg}">${item.emoji}</div>
      <div class="item-meta">
        <div class="item-name">${item.name}</div>
        <div class="item-worn" style="color:${wornColor}">
          <span class="worn-dot" style="background:${dotColor}"></span>${wornText}
        </div>
      </div>`;
    card.addEventListener('click', () => showItemModal(item));
    grid.appendChild(card);
  });

  const addTile = document.createElement('button');
  addTile.className = 'add-tile';
  addTile.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add item`;
  addTile.addEventListener('click', () => navigateTo('add'));
  grid.appendChild(addTile);
}

document.getElementById('wardrobe-search').addEventListener('input', renderWardrobe);

function showItemModal(item) {
  const content = document.getElementById('modal-content');
  let wornText;
  if (item.lastWorn === 999) wornText = 'Never worn';
  else if (item.lastWorn === 0) wornText = 'Worn today';
  else wornText = `${item.lastWorn} days ago`;

  content.innerHTML = `
    <div class="modal-thumb" style="background:${item.bg}">${item.emoji}</div>
    <div class="modal-item-name">${item.name}</div>
    <div class="modal-meta-row"><span>Category</span><span class="modal-meta-val">${item.category}</span></div>
    <div class="modal-meta-row"><span>Occasions</span><span class="modal-meta-val">${item.occasions.join(', ')}</span></div>
    <div class="modal-meta-row"><span>Best weather</span><span class="modal-meta-val">${item.weather.join(', ')}</span></div>
    <div class="modal-meta-row"><span>Colour</span><span class="modal-meta-val">${item.colour}</span></div>
    <div class="modal-meta-row"><span>Pairs with</span><span class="modal-meta-val">${item.pairs_with.join(', ')}</span></div>
    <div class="modal-meta-row"><span>Last worn</span><span class="modal-meta-val">${wornText}</span></div>
    <div class="modal-meta-row"><span>Total wears</span><span class="modal-meta-val">${item.wearCount}×</span></div>
    <div class="modal-actions">
      <button class="btn-danger" id="modal-delete-btn">Remove from wardrobe</button>
    </div>`;

  document.getElementById('modal-delete-btn').addEventListener('click', () => {
    state.wardrobe = state.wardrobe.filter(w => w.id !== item.id);
    save(); closeModal(); renderWardrobe();
  });
  document.getElementById('modal-overlay').style.display = 'flex';
}

// ── SETTINGS ───────────────────────────────────────────────────────────────

const VIBE_OPTIONS = ['work','smart','casual','weekend','no preference'];

function renderSettings() {
  const dayVibesEl = document.getElementById('day-vibes');
  dayVibesEl.innerHTML = '';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day, i) => {
    const row = document.createElement('div');
    row.className = 'day-vibe-row';
    const badge = document.createElement('div');
    badge.className = 'day-badge';
    badge.textContent = day.slice(0,2);
    const opts = document.createElement('div');
    opts.className = 'vibe-options';
    VIBE_OPTIONS.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'vibe-btn' + (state.settings.dayVibes[i] === v ? ' active' : '');
      btn.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      btn.addEventListener('click', () => { state.settings.dayVibes[i] = v; save(); renderSettings(); });
      opts.appendChild(btn);
    });
    row.appendChild(badge);
    row.appendChild(opts);
    dayVibesEl.appendChild(row);
  });

  renderCustomRules();

  const togglesEl = document.getElementById('ai-toggles');
  const toggleDefs = [
    { key: 'rotateEvenly', label: 'Rotate wardrobe evenly', sub: 'Surfaces less-worn items' },
    { key: 'weatherAware', label: 'Weather-aware picks', sub: 'Adjusts by daily forecast' },
    { key: 'calendarAware', label: 'Calendar-aware picks', sub: 'Reads events for occasion' },
    { key: 'lockApproved', label: 'Lock approved outfits', sub: "Won't change confirmed picks" },
    { key: 'planOnSunday', label: 'Plan full week on Sunday', sub: 'All 7 days generated Sunday' },
  ];
  togglesEl.innerHTML = '';
  toggleDefs.forEach(def => {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.innerHTML = `
      <div><div class="toggle-label">${def.label}</div><div class="toggle-sub">${def.sub}</div></div>
      <label class="toggle-switch">
        <input type="checkbox" ${state.settings[def.key] ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>`;
    row.querySelector('input').addEventListener('change', e => { state.settings[def.key] = e.target.checked; save(); });
    togglesEl.appendChild(row);
  });

  document.getElementById('cooldown-select').value = state.settings.cooldown;
  document.getElementById('cooldown-select').onchange = e => { state.settings.cooldown = parseInt(e.target.value); save(); };

  // API Key field
  const apiKeyEl = document.getElementById('api-key-field');
  if (apiKeyEl) {
    apiKeyEl.value = state.settings.apiKey ? '••••••••••••••••' : '';
    apiKeyEl.placeholder = state.settings.apiKey ? 'Key saved ✓' : 'Paste your Claude API key here';
    apiKeyEl.addEventListener('focus', () => { apiKeyEl.value = state.settings.apiKey || ''; });
    apiKeyEl.addEventListener('blur', () => {
      const val = apiKeyEl.value.trim();
      if (val && val.startsWith('sk-')) { state.settings.apiKey = val; save(); apiKeyEl.value = '••••••••••••••••'; }
    });
  }
}

function renderCustomRules() {
  const list = document.getElementById('custom-rules-list');
  list.innerHTML = '';
  state.settings.customRules.forEach((rule, i) => {
    const chip = document.createElement('span');
    chip.className = 'rule-chip';
    chip.innerHTML = `${rule} <button aria-label="Remove rule">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.settings.customRules.splice(i, 1);
      save(); renderCustomRules();
    });
    list.appendChild(chip);
  });
}

document.getElementById('add-rule-btn').addEventListener('click', () => {
  const input = document.getElementById('new-rule-input');
  const val = input.value.trim();
  if (!val) return;
  state.settings.customRules.push(val);
  save(); input.value = ''; renderCustomRules();
});

// ── ADD ITEM FLOW ──────────────────────────────────────────────────────────

const ADD_STEPS = {
  1: { label: 'Step 1 of 3 — Take a photo' },
  2: { label: 'Step 2 of 3 — AI is analysing…' },
  3: { label: 'Step 3 of 3 — Confirm & save' }
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAddStep() {
  document.getElementById('add-step-label').textContent = ADD_STEPS[state.addStep].label;
  document.querySelectorAll('.step-dot').forEach(dot => {
    const n = parseInt(dot.dataset.step);
    dot.className = 'step-dot';
    if (n < state.addStep) dot.classList.add('done');
    else if (n === state.addStep) dot.classList.add('active');
  });
  const body = document.getElementById('add-body');
  body.innerHTML = '';
  if (state.addStep === 1) renderStep1(body);
  if (state.addStep === 2) renderStep2(body);
  if (state.addStep === 3) renderStep3(body);
}

function renderStep1(container) {
  const div = document.createElement('div');
  div.className = 'add-step active';
  div.innerHTML = `
    <div class="photo-preview-box">
      <label class="upload-zone" for="photo-upload" style="cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>Tap to take a photo<br/>or upload from library</span>
      </label>
      <input type="file" id="photo-upload" accept="image/*" capture="environment" style="display:none;" />
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center;gap:12px;padding:20px 0;">
      <p style="font-size:14px;color:var(--text-2);line-height:1.6;">Take a clear photo of a clothing item. ${state.settings.apiKey ? 'Claude AI will automatically detect everything.' : 'Add your API key in Settings for real AI analysis.'}</p>
      <p style="font-size:12px;color:var(--text-3);">Tip: lay the item flat or hang it for best results.</p>
    </div>`;
  container.appendChild(div);

  document.getElementById('photo-upload').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    state.uploadedPhoto = base64;
    state.addStep = 2;
    renderAddStep();

    if (state.settings.apiKey) {
      try {
        const profileContext = state.styleProfile
          ? `The wearer has: body shape ${state.styleProfile.bodyShape}, ${state.styleProfile.undertone} undertone, colouring: ${state.styleProfile.colouring}. Best colours for her: ${state.styleProfile.colourPalette?.join(', ')}.`
          : '';

        const result = await callClaude(
          `Analyse this clothing item photo. ${profileContext} Return ONLY a JSON object: { "name": "short descriptive name", "category": "top|bottom|dress|outerwear|shoes|accessory", "occasions": ["work","smart","casual","weekend","evening"], "weather": ["warm","mild","cool","cold","rainy","any"], "colour": "primary colour", "pairs_with": ["2-4 keywords"], "confidence": 0.95 }`,
          "You are a fashion expert. Analyse clothing items accurately. Consider how each item works with the wearer's profile if provided. Return only valid JSON.",
          base64.split(',')[1],
          file.type || 'image/jpeg'
        );
        state.pendingItem = extractJSON(result);
        if (!state.pendingItem) throw new Error("Couldn't read response");
      } catch(err) {
        state.pendingItem = simulateAIAnalysis();
        if (err.message !== 'No API key') console.warn('AI fallback:', err.message);
      }
    } else {
      await new Promise(r => setTimeout(r, 2000));
      state.pendingItem = simulateAIAnalysis();
    }

    state.addStep = 3;
    renderAddStep();
  });
}

function renderStep2(container) {
  const div = document.createElement('div');
  div.className = 'add-step active';
  div.style.justifyContent = 'center';
  div.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div style="font-weight:500;color:var(--purple);">${state.settings.apiKey ? 'Claude AI is analysing your item…' : 'Analysing your item…'}</div>
      <div style="font-size:13px;color:var(--text-3);">Detecting category, colour, occasions & more</div>
    </div>`;
  container.appendChild(div);
}

function simulateAIAnalysis() {
  const options = [
    { name: 'White cotton shirt', category: 'top', occasions: ['work','casual'], weather: ['mild','warm','any'], colour: 'White', pairs_with: ['everything'], emoji: '👕', bg: '#F1EFE8', confidence: 0.94 },
    { name: 'Black trousers', category: 'bottom', occasions: ['work','smart','evening'], weather: ['cool','mild'], colour: 'Black', pairs_with: ['white','silk','blouse'], emoji: '👖', bg: '#E6E6E6', confidence: 0.91 },
    { name: 'Floral blouse', category: 'top', occasions: ['casual','smart','weekend'], weather: ['warm','mild'], colour: 'Multi', pairs_with: ['white','nude','tan'], emoji: '👚', bg: '#FAECE7', confidence: 0.88 },
    { name: 'Midi skirt', category: 'bottom', occasions: ['smart','weekend','evening'], weather: ['warm','mild'], colour: 'Sage green', pairs_with: ['white','cream','tan'], emoji: '👗', bg: '#E1F5EE', confidence: 0.89 },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function renderStep3(container) {
  const item = state.pendingItem;
  if (!item) return;
  const emojiMap = { top:'👚', bottom:'👖', dress:'👗', outerwear:'🧥', shoes:'👟', accessory:'👜' };
  const bgMap = { top:'#FBEAF0', bottom:'#E6F1FB', dress:'#FAECE7', outerwear:'#EEEDFE', shoes:'#F1EFE8', accessory:'#FAEEDA' };
  const emoji = item.emoji || emojiMap[item.category] || '👕';
  const bg = item.bg || bgMap[item.category] || '#F5F5F2';

  const div = document.createElement('div');
  div.className = 'add-step active';
  div.innerHTML = `
    <div class="photo-preview-box">
      <div class="photo-display">${state.uploadedPhoto ? `<img src="${state.uploadedPhoto}" alt="Uploaded item" />` : emoji}</div>
      <button class="btn-secondary" style="width:100%;margin-top:8px;" id="retake-btn">Retake photo</button>
    </div>
    <div class="add-form">
      <div class="ai-detected-box">
        <div class="ai-detected-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${state.settings.apiKey ? 'Claude AI assessment' : 'AI assessment'} · tap name to edit
        </div>
        <div class="ai-field-row"><span class="ai-field-key">Name</span><span class="ai-field-val">${item.name}</span></div>
        <div class="ai-field-row"><span class="ai-field-key">Category</span><span class="ai-field-val">${item.category}</span></div>
        <div class="ai-field-row"><span class="ai-field-key">Occasions</span><span class="ai-field-val">${Array.isArray(item.occasions) ? item.occasions.join(', ') : item.occasions}</span></div>
        <div class="ai-field-row"><span class="ai-field-key">Best weather</span><span class="ai-field-val">${Array.isArray(item.weather) ? item.weather.join(', ') : item.weather}</span></div>
        <div class="ai-field-row"><span class="ai-field-key">Colour</span><span class="ai-field-val">${item.colour}</span></div>
        <div class="ai-field-row"><span class="ai-field-key">Pairs with</span><span class="ai-field-val">${Array.isArray(item.pairs_with) ? item.pairs_with.join(', ') : item.pairs_with}</span></div>
        <div class="confidence-row">
          <div class="confidence-track"><div class="confidence-fill" style="width:${Math.round((item.confidence||0.9)*100)}%"></div></div>
          <span class="confidence-label">${Math.round((item.confidence||0.9)*100)}% confident</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Name (optional edit)</label>
        <input class="form-input" id="item-name-input" value="${item.name}" />
      </div>
      <button class="btn-primary" id="save-item-btn">Save to wardrobe</button>
      <p class="add-note">All fields are auto-filled. Edit the name above if anything looks off.</p>
    </div>`;
  container.appendChild(div);

  document.getElementById('retake-btn').addEventListener('click', () => {
    state.addStep = 1; state.pendingItem = null; state.uploadedPhoto = null; renderAddStep();
  });
  document.getElementById('save-item-btn').addEventListener('click', () => {
    const name = document.getElementById('item-name-input').value.trim() || item.name;
    const newItem = {
      id: 'w' + Date.now(), name,
      category: item.category,
      occasions: Array.isArray(item.occasions) ? item.occasions : [item.occasions],
      weather: Array.isArray(item.weather) ? item.weather : [item.weather],
      colour: item.colour,
      pairs_with: Array.isArray(item.pairs_with) ? item.pairs_with : [item.pairs_with],
      emoji, bg,
      wearCount: 0, lastWorn: 999,
      ai_confidence: item.confidence || 0.9
    };
    state.wardrobe.unshift(newItem);
    save();
    state.addStep = 1; state.pendingItem = null; state.uploadedPhoto = null;
    navigateTo('wardrobe');
  });
}

document.getElementById('add-back-btn').addEventListener('click', () => {
  if (state.addStep > 1) {
    state.addStep = 1; state.pendingItem = null; state.uploadedPhoto = null; renderAddStep();
  } else {
    navigateTo('wardrobe');
  }
});

// ── INIT ───────────────────────────────────────────────────────────────────
renderCalendar();
renderWardrobe();
