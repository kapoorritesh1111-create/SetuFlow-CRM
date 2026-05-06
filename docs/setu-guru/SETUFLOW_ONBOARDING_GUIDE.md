<svg viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A1628"/>
      <stop offset="60%" stop-color="#0F2744"/>
      <stop offset="100%" stop-color="#1A3F6F"/>
    </linearGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E4D8C"/>
      <stop offset="100%" stop-color="#0F2744"/>
    </linearGradient>
    <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E40AF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1E3A8A" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="armGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E4D8C"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#93C5FD"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </radialGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <filter id="innerGlow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background sky -->
  <rect width="600" height="700" fill="url(#skyGrad)"/>

  <!-- Stars -->
  <circle cx="50" cy="40" r="1.5" fill="white" opacity="0.6"/>
  <circle cx="120" cy="20" r="1" fill="white" opacity="0.8"/>
  <circle cx="200" cy="55" r="1.5" fill="white" opacity="0.5"/>
  <circle cx="320" cy="15" r="1" fill="white" opacity="0.7"/>
  <circle cx="450" cy="35" r="1.5" fill="white" opacity="0.6"/>
  <circle cx="530" cy="60" r="1" fill="white" opacity="0.9"/>
  <circle cx="80" cy="80" r="1" fill="white" opacity="0.4"/>
  <circle cx="490" cy="90" r="1.5" fill="white" opacity="0.5"/>
  <circle cx="560" cy="25" r="1" fill="white" opacity="0.7"/>
  <circle cx="380" cy="70" r="1" fill="white" opacity="0.6"/>

  <!-- ====== BRIDGE IN BACKGROUND ====== -->
  <!-- Water / river -->
  <rect x="0" y="540" width="600" height="160" fill="url(#waterGrad)" rx="0"/>
  <!-- Water shimmer lines -->
  <line x1="60" y1="560" x2="180" y2="560" stroke="#60A5FA" stroke-width="1" opacity="0.3"/>
  <line x1="250" y1="575" x2="390" y2="575" stroke="#60A5FA" stroke-width="1" opacity="0.2"/>
  <line x1="420" y1="555" x2="540" y2="555" stroke="#60A5FA" stroke-width="1" opacity="0.3"/>
  <line x1="30" y1="585" x2="150" y2="585" stroke="#93C5FD" stroke-width="1" opacity="0.15"/>
  <line x1="350" y1="595" x2="490" y2="595" stroke="#93C5FD" stroke-width="1" opacity="0.15"/>

  <!-- Bridge road/deck -->
  <rect x="0" y="530" width="600" height="22" fill="#1E3A6E" rx="3"/>
  <rect x="0" y="533" width="600" height="3" fill="#2563EB" opacity="0.5"/>
  <!-- Road markings -->
  <rect x="80" y="537" width="30" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>
  <rect x="180" y="537" width="30" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>
  <rect x="280" y="537" width="30" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>
  <rect x="380" y="537" width="30" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>
  <rect x="480" y="537" width="30" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>

  <!-- Left tower -->
  <rect x="60" y="390" width="26" height="152" rx="4" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <rect x="64" y="394" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="64" y="415" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="64" y="436" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="64" y="457" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <!-- Left tower top decoration -->
  <polygon points="60,390 73,370 86,390" fill="#2563EB"/>
  <circle cx="73" cy="368" r="6" fill="#F59E0B" filter="url(#glow)"/>
  <!-- Left crossbeam top -->
  <rect x="58" y="408" width="30" height="5" rx="2" fill="#2563EB"/>

  <!-- Right tower -->
  <rect x="514" y="390" width="26" height="152" rx="4" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <rect x="518" y="394" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="518" y="415" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="518" y="436" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="518" y="457" width="18" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  <!-- Right tower top decoration -->
  <polygon points="514,390 527,370 540,390" fill="#2563EB"/>
  <circle cx="527" cy="368" r="6" fill="#F59E0B" filter="url(#glow)"/>
  <!-- Right crossbeam top -->
  <rect x="512" y="408" width="30" height="5" rx="2" fill="#2563EB"/>

  <!-- Bridge suspension cables - main catenary curves -->
  <path d="M73 370 Q200 460 300 475 Q400 460 527 370" stroke="#93C5FD" stroke-width="2.5" fill="none" opacity="0.8"/>
  <path d="M73 370 Q200 450 300 465 Q400 450 527 370" stroke="#60A5FA" stroke-width="1.5" fill="none" opacity="0.5"/>

  <!-- Vertical cable hangers -->
  <line x1="120" y1="414" x2="120" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="160" y1="435" x2="160" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="200" y1="450" x2="200" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="240" y1="460" x2="240" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="280" y1="466" x2="280" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="320" y1="466" x2="320" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="360" y1="460" x2="360" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="400" y1="450" x2="400" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="440" y1="435" x2="440" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>
  <line x1="480" y1="414" x2="480" y2="535" stroke="#93C5FD" stroke-width="1" opacity="0.5"/>

  <!-- ====== ROBOT CHARACTER ====== -->

  <!-- Robot shadow on bridge -->
  <ellipse cx="300" cy="545" rx="80" ry="12" fill="#000000" opacity="0.35"/>

  <!-- LEGS -->
  <!-- Left leg -->
  <rect x="248" y="460" width="34" height="75" rx="10" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="252" y="464" width="26" height="6" rx="3" fill="#3B82F6" opacity="0.4"/>
  <!-- Left foot -->
  <rect x="240" y="528" width="48" height="18" rx="9" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <rect x="244" y="532" width="20" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>

  <!-- Right leg -->
  <rect x="318" y="460" width="34" height="75" rx="10" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="322" y="464" width="26" height="6" rx="3" fill="#3B82F6" opacity="0.4"/>
  <!-- Right foot -->
  <rect x="312" y="528" width="48" height="18" rx="9" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <rect x="316" y="532" width="20" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>

  <!-- BODY -->
  <rect x="200" y="300" width="200" height="175" rx="28" fill="url(#bodyGrad)" stroke="#2563EB" stroke-width="2" filter="url(#shadow)"/>

  <!-- Body details - circuit lines -->
  <line x1="215" y1="340" x2="270" y2="340" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="215" y1="355" x2="255" y2="355" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="330" y1="340" x2="385" y2="340" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="345" y1="355" x2="385" y2="355" stroke="#2563EB" stroke-width="1" opacity="0.4"/>

  <!-- Body - chest panel / core glow -->
  <rect x="240" y="330" width="120" height="90" rx="14" fill="#0A1628" stroke="#2563EB" stroke-width="1.5"/>
  <!-- Core energy crystal - bridge arch shape inside chest -->
  <path d="M260 410 Q300 360 340 410 Z" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.8"/>
  <path d="M268 410 Q300 368 332 410 Z" fill="none" stroke="#FCD34D" stroke-width="1.5" opacity="0.6"/>
  <!-- Core center dot -->
  <circle cx="300" cy="388" r="16" fill="url(#coreGlow)" opacity="0.9" filter="url(#softGlow)"/>
  <circle cx="300" cy="388" r="8" fill="#FCD34D" filter="url(#glow)"/>
  <circle cx="300" cy="388" r="4" fill="white"/>

  <!-- Body - status indicators -->
  <circle cx="220" cy="320" r="5" fill="#059669" filter="url(#glow)"/>
  <circle cx="235" cy="320" r="5" fill="#2563EB" filter="url(#glow)"/>
  <circle cx="250" cy="320" r="5" fill="#F59E0B" filter="url(#glow)"/>

  <!-- Bridge motif embossed on body bottom -->
  <path d="M215 455 Q230 440 250 455" stroke="#2563EB" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M270 455 Q300 435 330 455" stroke="#2563EB" stroke-width="1.5" fill="none" opacity="0.7"/>
  <path d="M350 455 Q370 440 385 455" stroke="#2563EB" stroke-width="1.5" fill="none" opacity="0.5"/>
  <!-- Vertical bridge pillars on body -->
  <line x1="237" y1="440" x2="237" y2="460" stroke="#2563EB" stroke-width="1.5" opacity="0.6"/>
  <line x1="300" y1="435" x2="300" y2="460" stroke="#2563EB" stroke-width="1.5" opacity="0.6"/>
  <line x1="363" y1="440" x2="363" y2="460" stroke="#2563EB" stroke-width="1.5" opacity="0.6"/>

  <!-- ARMS -->
  <!-- Left arm -->
  <rect x="158" y="310" width="46" height="28" rx="14" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5"/>
  <!-- Left forearm angled down -->
  <rect x="142" y="330" width="28" height="70" rx="12" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5" transform="rotate(-10, 156, 365)"/>
  <!-- Left hand -->
  <rect x="128" y="390" width="44" height="36" rx="12" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <!-- Finger lines on hand -->
  <line x1="140" y1="396" x2="140" y2="420" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>
  <line x1="152" y1="394" x2="152" y2="422" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>
  <line x1="164" y1="396" x2="164" y2="420" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>

  <!-- Right arm -->
  <rect x="396" y="310" width="46" height="28" rx="14" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5"/>
  <!-- Right forearm angled down -->
  <rect x="430" y="330" width="28" height="70" rx="12" fill="url(#armGrad)" stroke="#2563EB" stroke-width="1.5" transform="rotate(10, 444, 365)"/>
  <!-- Right hand - holding a glowing bridge blueprint scroll -->
  <rect x="428" y="390" width="44" height="36" rx="12" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <line x1="436" y1="396" x2="436" y2="420" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>
  <line x1="448" y1="394" x2="448" y2="422" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>
  <line x1="460" y1="396" x2="460" y2="420" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>

  <!-- NECK -->
  <rect x="276" y="270" width="48" height="38" rx="10" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <!-- Neck details -->
  <rect x="282" y="276" width="36" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="282" y="284" width="36" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>
  <rect x="282" y="292" width="36" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>

  <!-- HEAD -->
  <!-- Outer head shape - slightly trapezoidal like a robot -->
  <rect x="195" y="140" width="210" height="140" rx="30" fill="url(#headGrad)" stroke="#3B82F6" stroke-width="2.5" filter="url(#shadow)"/>

  <!-- Head top dome/bridge arch shape -->
  <path d="M210 168 Q300 110 390 168" stroke="url(#goldGrad)" stroke-width="3" fill="none" filter="url(#glow)"/>
  <path d="M225 158 Q300 120 375 158" stroke="#FCD34D" stroke-width="1.5" fill="none" opacity="0.7"/>

  <!-- Bridge suspension cables on head (mini) -->
  <!-- Left mini tower on head -->
  <rect x="213" y="140" width="10" height="28" rx="3" fill="#1E40AF" stroke="#60A5FA" stroke-width="1"/>
  <polygon points="212,140 218,128 224,140" fill="#3B82F6"/>
  <circle cx="218" cy="126" r="4" fill="#FCD34D" filter="url(#glow)"/>
  <!-- Right mini tower on head -->
  <rect x="377" y="140" width="10" height="28" rx="3" fill="#1E40AF" stroke="#60A5FA" stroke-width="1"/>
  <polygon points="376,140 382,128 388,140" fill="#3B82F6"/>
  <circle cx="382" cy="126" r="4" fill="#FCD34D" filter="url(#glow)"/>
  <!-- Mini cables from towers -->
  <path d="M218 126 Q300 165 382 126" stroke="#93C5FD" stroke-width="1.5" fill="none" opacity="0.7"/>

  <!-- EYES -->
  <!-- Left eye housing -->
  <rect x="225" y="180" width="66" height="52" rx="16" fill="#0A1628" stroke="#2563EB" stroke-width="2"/>
  <!-- Left eye iris -->
  <circle cx="258" cy="206" r="20" fill="url(#eyeGlow)" filter="url(#glow)"/>
  <!-- Left pupil -->
  <circle cx="258" cy="206" r="10" fill="#0A1628"/>
  <circle cx="258" cy="206" r="6" fill="#60A5FA" filter="url(#glow)"/>
  <circle cx="258" cy="206" r="3" fill="white"/>
  <!-- Eye shine -->
  <circle cx="264" cy="200" r="3" fill="white" opacity="0.8"/>

  <!-- Right eye housing -->
  <rect x="309" y="180" width="66" height="52" rx="16" fill="#0A1628" stroke="#2563EB" stroke-width="2"/>
  <!-- Right eye iris -->
  <circle cx="342" cy="206" r="20" fill="url(#eyeGlow)" filter="url(#glow)"/>
  <!-- Right pupil -->
  <circle cx="342" cy="206" r="10" fill="#0A1628"/>
  <circle cx="342" cy="206" r="6" fill="#60A5FA" filter="url(#glow)"/>
  <circle cx="342" cy="206" r="3" fill="white"/>
  <!-- Eye shine -->
  <circle cx="348" cy="200" r="3" fill="white" opacity="0.8"/>

  <!-- MOUTH - friendly arc / bridge shape smile -->
  <path d="M242 248 Q300 275 358 248" stroke="#FCD34D" stroke-width="3.5" fill="none" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M252 252 Q300 270 348 252" stroke="#FDE68A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>
  <!-- Mouth dots (bridge pillars) -->
  <circle cx="242" cy="248" r="4" fill="#F59E0B"/>
  <circle cx="358" cy="248" r="4" fill="#F59E0B"/>
  <circle cx="300" cy="268" r="3" fill="#FCD34D" opacity="0.7"/>

  <!-- Ear antennae -->
  <!-- Left antenna -->
  <rect x="193" y="190" width="12" height="40" rx="6" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <circle cx="199" cy="186" r="9" fill="#0A1628" stroke="#3B82F6" stroke-width="1.5"/>
  <circle cx="199" cy="186" r="5" fill="#F59E0B" filter="url(#glow)"/>
  <!-- Right antenna -->
  <rect x="395" y="190" width="12" height="40" rx="6" fill="#1E4D8C" stroke="#2563EB" stroke-width="1.5"/>
  <circle cx="401" cy="186" r="9" fill="#0A1628" stroke="#3B82F6" stroke-width="1.5"/>
  <circle cx="401" cy="186" r="5" fill="#F59E0B" filter="url(#glow)"/>

  <!-- Head top indicator lights -->
  <circle cx="270" cy="155" r="4" fill="#059669" opacity="0.8" filter="url(#glow)"/>
  <circle cx="300" cy="150" r="5" fill="#3B82F6" opacity="0.9" filter="url(#glow)"/>
  <circle cx="330" cy="155" r="4" fill="#059669" opacity="0.8" filter="url(#glow)"/>

  <!-- ====== NAME PLATE ====== -->
  <!-- Name badge on body -->
  <rect x="232" y="430" width="136" height="24" rx="8" fill="#0A1628" stroke="url(#goldGrad)" stroke-width="1.5"/>
  <text x="300" y="447" text-anchor="middle" font-size="11" font-weight="700" fill="url(#goldGrad)" letter-spacing="1">SETU GURU</text>

  <!-- ====== TITLE TEXT ====== -->
  <text x="300" y="608" text-anchor="middle" font-size="32" font-weight="900" fill="url(#goldGrad)" letter-spacing="3" filter="url(#glow)">SETU GURU</text>
  <text x="300" y="634" text-anchor="middle" font-size="13" fill="#93C5FD" letter-spacing="4">सेतु गुरु</text>
  <text x="300" y="656" text-anchor="middle" font-size="11" fill="#60A5FA" letter-spacing="2" opacity="0.8">THE BRIDGE MASTER</text>

  <!-- Decorative line under title -->
  <line x1="180" y1="665" x2="420" y2="665" stroke="url(#goldGrad)" stroke-width="1" opacity="0.6"/>
  <circle cx="300" cy="665" r="3" fill="#FCD34D"/>
  <circle cx="180" cy="665" r="2" fill="#F59E0B" opacity="0.7"/>
  <circle cx="420" cy="665" r="2" fill="#F59E0B" opacity="0.7"/>

  <!-- Floating sparkles around the bot -->
  <circle cx="170" cy="250" r="3" fill="#FCD34D" opacity="0.7" filter="url(#glow)"/>
  <circle cx="165" cy="270" r="2" fill="#60A5FA" opacity="0.6"/>
  <circle cx="430" cy="240" r="3" fill="#FCD34D" opacity="0.7" filter="url(#glow)"/>
  <circle cx="440" cy="265" r="2" fill="#60A5FA" opacity="0.6"/>
  <circle cx="155" cy="380" r="2" fill="#93C5FD" opacity="0.5"/>
  <circle cx="445" cy="370" r="2" fill="#93C5FD" opacity="0.5"/>

  <!-- Small bridge motif floating on left -->
  <path d="M110 300 Q135 282 160 300" stroke="#2563EB" stroke-width="1.5" fill="none" opacity="0.5"/>
  <line x1="117" y1="288" x2="117" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="135" y1="283" x2="135" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="153" y1="288" x2="153" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>

  <!-- Small bridge motif floating on right -->
  <path d="M440 300 Q465 282 490 300" stroke="#2563EB" stroke-width="1.5" fill="none" opacity="0.5"/>
  <line x1="447" y1="288" x2="447" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="465" y1="283" x2="465" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
  <line x1="483" y1="288" x2="483" y2="302" stroke="#2563EB" stroke-width="1" opacity="0.4"/>
</svg>
