/**
 * gameConfig.js — All static game data.
 * Change property prices, rents, images, or card text here without touching any game logic.
 * All monetary values are in Lakhs (₹L). 1 Crore = 100L.
 */

const GAME_CONFIG = {

  // ── Financial constants ────────────────────────────────────────────────────
  STARTING_CASH:        500,   // ₹5 Crores per player
  GO_SALARY:             20,   // ₹20L for passing / landing on GO
  JAIL_BAIL:              5,   // ₹5L to pay bail
  INCOME_TAX_FLAT:       20,   // ₹20L flat
  INCOME_TAX_PERCENT:  0.10,   // or 10% of total assets (player picks lower)
  LUXURY_TAX:            10,   // ₹10L BMC Luxury Cess
  SEA_LINK_TOLL:        7.5,   // ₹7.5L Sea Link toll (position 36)
  MORTGAGE_INTEREST:   0.10,   // 10% interest to unmortgage a property
  LOAN_INTEREST:       0.10,   // 10% interest on bank loans, charged on passing GO
  MAX_LOANS:              3,   // max simultaneous bank loans per player
  MAX_LOAN_AMOUNT:      100,   // ₹100L per individual loan
  AUCTION_MIN_BID:        1,   // ₹1L minimum opening bid at auction

  // ── Reserve Bank of India (RBI) monetary controls ──────────────────────────
  REPO_RATE_START:        8,   // opening RBI repo rate (%)
  REPO_RATE_MIN:          5,   // floor of the fluctuation band (%)
  REPO_RATE_MAX:         12,   // ceiling of the fluctuation band (%)
  REPO_RATE_INTERVAL:     3,   // rounds between RBI repo-rate reviews
  CRR_MINIMUM:           20,   // ₹20L liquid-cash floor (Cash Reserve Ratio advisory)
  LEDGER_MAX:           100,   // keep only the most recent N ledger entries

  // ── Supply of building tokens ──────────────────────────────────────────────
  TOTAL_OFFICES:  32,          // "offices" = houses
  TOTAL_HQ:       12,          // "headquarters" = hotels

  // ── Player cosmetics — South Mumbai heritage monuments ────────────────────
  PLAYER_COLORS:    ['#E63946', '#457B9D', '#2DC653', '#FF9F1C'],
  PLAYER_MONUMENTS: ['Gateway of India', 'Rajabai Clock Tower', 'Taj Mahal Palace', 'BSE Building'],
  PLAYER_BADGES:    ['GW', 'RT', 'TJ', 'BB'],
  // Board discs show the two-letter monument code.
  PLAYER_TOKENS:    ['GW', 'RT', 'TJ', 'BB'],

  // Minimalist single-colour landmark silhouettes (inherit currentColor).
  MONUMENT_ICONS: [
    // 1 — Gateway of India: grand central arch flanked by two arches, dome + minarets
    '<svg class="mono-ico" viewBox="0 0 64 64" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><rect x="6" y="57" width="52" height="4"/><rect x="9" y="53" width="46" height="4"/><path d="M11 53 V30 H53 V53 Z M25 53 V42 a7 7 0 0 1 14 0 V53 Z M14.5 53 V46 a4 4 0 0 1 8 0 V53 Z M41.5 53 V46 a4 4 0 0 1 8 0 V53 Z"/><rect x="10" y="20" width="5" height="10"/><rect x="49" y="20" width="5" height="10"/><path d="M9.5 20 a3 4 0 0 1 6 0 Z"/><path d="M48.5 20 a3 4 0 0 1 6 0 Z"/><rect x="12" y="13" width="1.6" height="6"/><rect x="50.4" y="13" width="1.6" height="6"/><rect x="26" y="27" width="12" height="3"/><path d="M23 28 a9 10 0 0 1 18 0 Z"/><rect x="31.2" y="13" width="1.6" height="6"/><circle cx="32" cy="12" r="2"/></svg>',
    // 2 — Rajabai Clock Tower: slender tiered gothic tower, clock face + spire
    '<svg class="mono-ico" viewBox="0 0 64 64" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><rect x="23" y="54" width="18" height="7"/><rect x="25" y="48" width="14" height="6"/><path d="M26 48 V22 H38 V48 Z M32 28 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 Z M28 38 h3 v7 h-3 z M33 38 h3 v7 h-3 z"/><rect x="24.5" y="19" width="15" height="3"/><path d="M32 5 L39 19 H25 Z"/><rect x="31.4" y="2" width="1.2" height="4"/></svg>',
    // 3 — Taj Mahal Palace: central onion dome, arched facade + corner chhatris
    '<svg class="mono-ico" viewBox="0 0 64 64" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><rect x="4" y="58" width="56" height="3"/><path d="M8 44 H56 V58 H8 Z M12 58 V51 a2 2 0 0 1 4 0 V58 Z M20 58 V51 a2 2 0 0 1 4 0 V58 Z M40 58 V51 a2 2 0 0 1 4 0 V58 Z M48 58 V51 a2 2 0 0 1 4 0 V58 Z"/><rect x="25" y="41" width="14" height="3"/><path d="M22 43 C21 24 43 24 42 43 Z"/><rect x="31.2" y="16" width="1.6" height="8"/><circle cx="32" cy="15" r="2.2"/><path d="M6 44 a5 6 0 0 1 10 0 Z"/><path d="M48 44 a5 6 0 0 1 10 0 Z"/><rect x="10" y="37" width="2" height="7"/><rect x="52" y="37" width="2" height="7"/></svg>',
    // 4 — BSE Building: tapered, tiered tower with setbacks + antenna
    '<svg class="mono-ico" viewBox="0 0 64 64" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><rect x="31" y="2" width="2" height="7"/><path d="M27 9 H37 L38 23 H26 Z M28.5 13 h7 v1.6 h-7 z M27.8 17.5 h8.4 v1.6 h-8.4 z"/><path d="M24 25 H40 L42 39 H22 Z M26 29 h12 v1.8 h-12 z M25 34 h14 v1.8 h-14 z"/><path d="M19 41 H45 L49 56 H15 Z M22 45 h20 v2 h-20 z M20 50 h24 v2 h-24 z"/><rect x="6" y="56" width="52" height="4"/></svg>',
  ],

  /**
   * Returns the HTML for a player's gold geometric monument badge containing
   * the landmark SVG icon.
   * @param {number} idx    player index
   * @param {string} size   '' | 'sm' | 'lg' size modifier class
   */
  monumentBadge(idx, size = '') {
    const color = this.PLAYER_COLORS[idx]    || '#999';
    const name  = this.PLAYER_MONUMENTS[idx] || '';
    const icon  = this.MONUMENT_ICONS[idx]   || '';
    return `<span class="mono-badge ${size}" style="--badge-color:${color}" role="img" aria-label="${name}" title="${name}">${icon}</span>`;
  },

  /** Raw landmark SVG for small contexts (e.g. board tokens). */
  monumentIcon(idx) {
    return this.MONUMENT_ICONS[idx] || '';
  },

  // ── Property development icons — custom smart-minimalist inline SVGs ────────
  // House (Estate): modern pitched roof + minimalist chimney + 4-pane window.
  // Drawn as a sleek flat outline in a muted accent (terracotta/bronze) via CSS;
  // strokes use currentColor so the tile/theme controls its tint.
  OFFICE_ICON:
    '<svg class="bld-ico bld-house" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17.2 7.6 V3.6 H19.1 V8.8"/>' +                 /* chimney */
    '<path d="M3.6 11.5 L12 4.3 L20.4 11.5"/>' +              /* pitched roof */
    '<path d="M5.4 10.2 V20 H18.6 V10.2"/>' +                 /* body */
    '<rect x="9.3" y="12.7" width="5.4" height="5.6" rx="0.5"/>' + /* window frame */
    '<path d="M12 12.7 V18.3 M9.3 15.5 H14.7"/>' +            /* 4-pane mullions */
    '</svg>',

  // Hotel (Luxury Estate / HQ): symmetrical multi-story tower, mathematically
  // spaced 3×3 window grid + central door, crowned with a row of 5 stars.
  // Deep-charcoal body (currentColor), ivory window cut-outs (--bld-window),
  // elegant gold stars (--gold) — never a heavy black blob.
  HQ_ICON:
    '<svg class="bld-ico bld-hotel" viewBox="0 0 24 24" aria-hidden="true">' +
    '<g class="hotel-stars" fill="var(--gold,#B68A3E)">' +
      '<path transform="translate(4.4 3.4) scale(0.6)" d="M0,-2.2 L0.66,-0.72 L2.2,-0.68 L0.93,0.27 L1.36,1.78 L0,0.88 L-1.36,1.78 L-0.93,0.27 L-2.2,-0.68 L-0.66,-0.72 Z"/>' +
      '<path transform="translate(8.2 3.4) scale(0.6)" d="M0,-2.2 L0.66,-0.72 L2.2,-0.68 L0.93,0.27 L1.36,1.78 L0,0.88 L-1.36,1.78 L-0.93,0.27 L-2.2,-0.68 L-0.66,-0.72 Z"/>' +
      '<path transform="translate(12 3.4) scale(0.6)" d="M0,-2.2 L0.66,-0.72 L2.2,-0.68 L0.93,0.27 L1.36,1.78 L0,0.88 L-1.36,1.78 L-0.93,0.27 L-2.2,-0.68 L-0.66,-0.72 Z"/>' +
      '<path transform="translate(15.8 3.4) scale(0.6)" d="M0,-2.2 L0.66,-0.72 L2.2,-0.68 L0.93,0.27 L1.36,1.78 L0,0.88 L-1.36,1.78 L-0.93,0.27 L-2.2,-0.68 L-0.66,-0.72 Z"/>' +
      '<path transform="translate(19.6 3.4) scale(0.6)" d="M0,-2.2 L0.66,-0.72 L2.2,-0.68 L0.93,0.27 L1.36,1.78 L0,0.88 L-1.36,1.78 L-0.93,0.27 L-2.2,-0.68 L-0.66,-0.72 Z"/>' +
    '</g>' +
    '<rect x="4" y="6.6" width="16" height="14.6" rx="1.1" fill="currentColor"/>' +
    '<g class="hotel-windows" fill="var(--bld-window,#F0E9D6)">' +
      '<rect x="5.7" y="8.3"  width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="10.8" y="8.3"  width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="15.9" y="8.3"  width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="5.7" y="11.6" width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="10.8" y="11.6" width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="15.9" y="11.6" width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="5.7" y="14.9" width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="15.9" y="14.9" width="2.4" height="2.4" rx="0.3"/>' +
      '<rect x="10.5" y="16.4" width="3" height="4.8" rx="0.4"/>' +  /* central door */
    '</g>' +
    '</svg>',

  /** Building markup for a property: '' / up to 4 houses / a single hotel. */
  buildingsMarkup(buildings) {
    if (!buildings) return '';
    if (buildings >= 5) return `<span class="bld hq">${this.HQ_ICON}</span>`;
    let html = '';
    for (let i = 0; i < buildings; i++) html += `<span class="bld office">${this.OFFICE_ICON}</span>`;
    return html;
  },

  // ── Color groups — building costs & display colours ───────────────────────
  COLOR_GROUPS: {
    brown:        { officeCost: 5,  hqCost: 20, hex: '#92400E', light: '#FDE68A' },
    'light-blue': { officeCost: 5,  hqCost: 20, hex: '#0369A1', light: '#BAE6FD' },
    pink:         { officeCost: 10, hqCost: 30, hex: '#BE185D', light: '#FBCFE8' },
    orange:       { officeCost: 10, hqCost: 30, hex: '#C2410C', light: '#FED7AA' },
    red:          { officeCost: 15, hqCost: 40, hex: '#B91C1C', light: '#FECACA' },
    yellow:       { officeCost: 15, hqCost: 40, hex: '#B45309', light: '#FEF08A' },
    green:        { officeCost: 20, hqCost: 50, hex: '#15803D', light: '#BBF7D0' },
    'dark-blue':  { officeCost: 20, hqCost: 50, hex: '#1D4ED8', light: '#BFDBFE' },
  },

  // ── Board spaces (0–39, clockwise from GO at bottom-right) ────────────────
  // rent[] = [base, 1 office, 2 offices, 3 offices, 4 offices, HQ]
  // railway rent[] = [1 owned, 2 owned, 3 owned, 4 owned]
  // utility rentMultiplier[] = [1 owned × dice, 2 owned × dice]
  // image: path placeholder — drop a photo here and it will appear on the card

  BOARD: [
    /* 0 */ {
      position: 0, name: 'GO', shortName: 'GO',
      type: 'corner', subtype: 'go',
      description: 'Collect ₹20L each time you pass or land here.',
      image: null,
    },
    /* 1 */ {
      position: 1, name: 'Colaba Causeway', shortName: 'Colaba',
      type: 'property', color: 'brown',
      price: 60, mortgage: 30,
      rent: [2, 10, 30, 90, 160, 250],
      image: 'images/colaba-causeway.jpg', // ← replace with real photo URL
      description: "Mumbai's most iconic shopping promenade.",
    },
    /* 2 */ {
      position: 2, name: 'Townie Gossip', shortName: 'Gossip',
      type: 'community_chest',
    },
    /* 3 */ {
      position: 3, name: 'Crawford Market', shortName: 'Crawford',
      type: 'property', color: 'brown',
      price: 60, mortgage: 30,
      rent: [4, 20, 60, 180, 320, 450],
      image: 'images/crawford-market.jpg',
      description: "Norman Gothic market built by William Emerson in 1869.",
    },
    /* 4 */ {
      position: 4, name: 'BMC Income Tax', shortName: 'Tax',
      type: 'tax', subtype: 'income',
      amount: 20,
      description: 'Pay ₹20L or 10% of total assets — your choice.',
    },
    /* 5 */ {
      position: 5, name: 'CSMT', shortName: 'CSMT',
      type: 'railway',
      price: 200, mortgage: 100,
      rent: [25, 50, 100, 200],
      image: 'images/csmt.jpg',
      description: 'Chhatrapati Shivaji Maharaj Terminus — UNESCO World Heritage.',
    },
    /* 6 */ {
      position: 6, name: 'Flora Fountain', shortName: 'Flora',
      type: 'property', color: 'light-blue',
      price: 100, mortgage: 50,
      rent: [6, 30, 90, 270, 400, 550],
      image: 'images/flora-fountain.jpg',
      description: 'Victorian fountain at the crossroads of Fort district.',
    },
    /* 7 */ {
      position: 7, name: 'Mumbai Hustle', shortName: 'Hustle',
      type: 'chance',
    },
    /* 8 */ {
      position: 8, name: 'Horniman Circle', shortName: 'Horniman',
      type: 'property', color: 'light-blue',
      price: 100, mortgage: 50,
      rent: [6, 30, 90, 270, 400, 550],
      image: 'images/horniman-circle.jpg',
      description: "Mumbai's oldest public garden, ringed by heritage buildings.",
    },
    /* 9 */ {
      position: 9, name: 'Apollo Bunder', shortName: 'Apollo',
      type: 'property', color: 'light-blue',
      price: 120, mortgage: 60,
      rent: [8, 40, 120, 360, 640, 900],
      image: 'images/apollo-bunder.jpg',
      description: 'Home to the Gateway of India and the Taj Mahal Palace.',
    },
    /* 10 */ {
      position: 10, name: 'Traffic Jam', shortName: 'Jail',
      type: 'corner', subtype: 'jail',
      description: 'Just Visiting — or stuck in Pedder Road traffic.',
    },
    /* 11 */ {
      position: 11, name: 'Grant Road', shortName: 'Grant Rd',
      type: 'property', color: 'pink',
      price: 140, mortgage: 70,
      rent: [10, 50, 150, 450, 625, 750],
      image: 'images/grant-road.jpg',
      description: 'Named after British Governor Sir Robert Grant.',
    },
    /* 12 */ {
      position: 12, name: 'BEST Electricity', shortName: 'BEST',
      type: 'utility',
      price: 150, mortgage: 75,
      rentMultiplier: [4, 10],
      image: 'images/best-electricity.jpg',
      description: 'Brihanmumbai Electric Supply and Transport Undertaking.',
    },
    /* 13 */ {
      position: 13, name: 'Esplanade', shortName: 'Esplanade',
      type: 'property', color: 'pink',
      price: 140, mortgage: 70,
      rent: [10, 50, 150, 450, 625, 750],
      image: 'images/esplanade.jpg',
      description: 'Historic Esplanade Maidan, heart of colonial Bombay.',
    },
    /* 14 */ {
      position: 14, name: 'Churchgate', shortName: 'Churchgate',
      type: 'railway',
      price: 200, mortgage: 100,
      rent: [25, 50, 100, 200],
      image: 'images/churchgate.jpg',
      description: 'Southern terminus of Western Railway suburban line.',
    },
    /* 15 */ {
      position: 15, name: 'Fort Street', shortName: 'Fort St',
      type: 'property', color: 'pink',
      price: 160, mortgage: 80,
      rent: [12, 60, 180, 500, 700, 900],
      image: 'images/fort-street.jpg',
      description: "The financial spine of Mumbai's Fort district.",
    },
    /* 16 */ {
      position: 16, name: 'Strand Road', shortName: 'Strand Rd',
      type: 'property', color: 'orange',
      price: 180, mortgage: 90,
      rent: [14, 70, 200, 550, 750, 950],
      image: 'images/strand-road.jpg',
      description: 'Scenic road stretching along the western waterfront.',
    },
    /* 17 */ {
      position: 17, name: 'Townie Gossip', shortName: 'Gossip',
      type: 'community_chest',
    },
    /* 18 */ {
      position: 18, name: 'Ballard Pier', shortName: 'Ballard',
      type: 'property', color: 'orange',
      price: 180, mortgage: 90,
      rent: [14, 70, 200, 550, 750, 950],
      image: 'images/ballard-pier.jpg',
      description: 'Colonial-era port precinct and cruise terminal.',
    },
    /* 19 */ {
      position: 19, name: 'Princess Street', shortName: 'Princess',
      type: 'property', color: 'orange',
      price: 200, mortgage: 100,
      rent: [16, 80, 220, 600, 800, 1100],
      image: 'images/princess-street.jpg',
      description: 'Named after the Princess of Wales, now a commercial hub.',
    },
    /* 20 */ {
      position: 20, name: 'Sea View Terrace', shortName: 'Terrace',
      type: 'corner', subtype: 'free_parking',
      description: 'Relax and enjoy the sea breeze — no cost, no penalty.',
    },
    /* 21 */ {
      position: 21, name: 'Kala Ghoda', shortName: 'Kala Ghoda',
      type: 'property', color: 'red',
      price: 220, mortgage: 110,
      rent: [18, 90, 250, 700, 875, 1050],
      image: 'images/kala-ghoda.jpg',
      description: "Mumbai's premier arts, culture, and gallery district.",
    },
    /* 22 */ {
      position: 22, name: 'Mumbai Hustle', shortName: 'Hustle',
      type: 'chance',
    },
    /* 23 */ {
      position: 23, name: 'Marine Drive', shortName: 'Marine Dr',
      type: 'property', color: 'red',
      price: 220, mortgage: 110,
      rent: [18, 90, 250, 700, 875, 1050],
      image: 'images/marine-drive.jpg',
      description: "The Queen's Necklace — Mumbai's most romantic promenade.",
    },
    /* 24 */ {
      position: 24, name: 'Worli Sea Face', shortName: 'Worli',
      type: 'property', color: 'red',
      price: 240, mortgage: 120,
      rent: [20, 100, 300, 750, 925, 1100],
      image: 'images/worli-sea-face.jpg',
      description: 'Premium seafront neighbourhood with Arabian Sea panoramas.',
    },
    /* 25 */ {
      position: 25, name: 'Marine Lines', shortName: 'Marine Lines',
      type: 'railway',
      price: 200, mortgage: 100,
      rent: [25, 50, 100, 200],
      image: 'images/marine-lines.jpg',
      description: 'Key Western Railway station near Oval Maidan.',
    },
    /* 26 */ {
      position: 26, name: 'Nariman Point', shortName: 'Nariman Pt',
      type: 'property', color: 'yellow',
      price: 260, mortgage: 130,
      rent: [22, 110, 330, 800, 975, 1150],
      image: 'images/nariman-point.jpg',
      description: "Mumbai's central business district — corporate HQ of India.",
    },
    /* 27 */ {
      position: 27, name: 'Cuffe Parade', shortName: 'Cuffe Parade',
      type: 'property', color: 'yellow',
      price: 260, mortgage: 130,
      rent: [22, 110, 330, 800, 975, 1150],
      image: 'images/cuffe-parade.jpg',
      description: 'Exclusive enclave with luxury towers facing the sea.',
    },
    /* 28 */ {
      position: 28, name: 'Reliance Energy', shortName: 'Reliance',
      type: 'utility',
      price: 150, mortgage: 75,
      rentMultiplier: [4, 10],
      image: 'images/reliance-energy.jpg',
      description: "Mumbai's alternative power provider for premium zones.",
    },
    /* 29 */ {
      position: 29, name: 'Pedder Road', shortName: 'Pedder Rd',
      type: 'property', color: 'yellow',
      price: 280, mortgage: 140,
      rent: [24, 120, 360, 850, 1025, 1200],
      image: 'images/pedder-road.jpg',
      description: 'One of Asia\'s most coveted and notoriously congested addresses.',
    },
    /* 30 */ {
      position: 30, name: 'No-Parking Zone', shortName: 'Go Jail',
      type: 'corner', subtype: 'go_to_jail',
      description: 'TOWED! Go directly to Traffic Jam — no ₹20L for you.',
    },
    /* 31 */ {
      position: 31, name: 'Malabar Hill', shortName: 'Malabar Hill',
      type: 'property', color: 'green',
      price: 300, mortgage: 150,
      rent: [26, 130, 390, 900, 1100, 1275],
      image: 'images/malabar-hill.jpg',
      description: "Lush hilltop enclave — home to the Governor's official residence.",
    },
    /* 32 */ {
      position: 32, name: 'Breach Candy', shortName: 'Breach Candy',
      type: 'property', color: 'green',
      price: 300, mortgage: 150,
      rent: [26, 130, 390, 900, 1100, 1275],
      image: 'images/breach-candy.jpg',
      description: 'Ultra-premium neighbourhood with a private beach club.',
    },
    /* 33 */ {
      position: 33, name: 'Mumbai Hustle', shortName: 'Hustle',
      type: 'chance',
    },
    /* 34 */ {
      position: 34, name: 'Altamount Road', shortName: 'Altamount',
      type: 'property', color: 'green',
      price: 320, mortgage: 160,
      rent: [28, 150, 450, 1000, 1200, 1400],
      image: 'images/altamount-road.jpg',
      description: "Billionaire's Row — consistently ranked among Asia's priciest streets.",
    },
    /* 35 */ {
      position: 35, name: 'Mumbai Central', shortName: 'Mum. Central',
      type: 'railway',
      price: 200, mortgage: 100,
      rent: [25, 50, 100, 200],
      image: 'images/mumbai-central.jpg',
      description: 'Major long-distance and suburban rail terminus.',
    },
    /* 36 */ {
      position: 36, name: 'Sea Link Toll', shortName: 'Sea Link',
      type: 'tax', subtype: 'luxury',
      amount: 7.5,
      description: 'Pay ₹7.5L toll for the Bandra-Worli Sea Link.',
    },
    /* 37 */ {
      position: 37, name: 'Carmichael Road', shortName: 'Carmichael',
      type: 'property', color: 'dark-blue',
      price: 350, mortgage: 175,
      rent: [35, 175, 500, 1100, 1300, 1500],
      image: 'images/carmichael-road.jpg',
      description: 'Prestigious address connecting Pedder Road to Napean Sea Road.',
    },
    /* 38 */ {
      position: 38, name: 'BMC Luxury Cess', shortName: 'Luxury Cess',
      type: 'tax', subtype: 'luxury',
      amount: 10,
      description: 'Pay ₹10L BMC Luxury Cess.',
    },
    /* 39 */ {
      position: 39, name: 'Nepean Sea Road', shortName: 'Nepean Sea Rd',
      type: 'property', color: 'dark-blue',
      price: 400, mortgage: 200,
      rent: [50, 200, 600, 1400, 1700, 2000],
      image: 'images/nepean-sea-road.jpg',
      description: 'The pinnacle of South Mumbai real estate — sea views, legacy, exclusivity.',
    },
  ],

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Return the config object for a board position. */
  getSpace(position) {
    return this.BOARD[position];
  },

  /** Return all positions that belong to a color group. */
  getColorGroupPositions(color) {
    return this.BOARD
      .filter(s => s.color === color)
      .map(s => s.position);
  },

  /** Return all railway positions. */
  getRailwayPositions() {
    return this.BOARD.filter(s => s.type === 'railway').map(s => s.position);
  },

  /** Return all utility positions. */
  getUtilityPositions() {
    return this.BOARD.filter(s => s.type === 'utility').map(s => s.position);
  },
};
