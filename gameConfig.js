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

  // ── Supply of building tokens ──────────────────────────────────────────────
  TOTAL_OFFICES:  32,          // "offices" = houses
  TOTAL_HQ:       12,          // "headquarters" = hotels

  // ── Player cosmetics ──────────────────────────────────────────────────────
  PLAYER_COLORS: ['#E63946', '#457B9D', '#2DC653', '#FF9F1C'],
  PLAYER_TOKENS: ['🚗', '✈️', '⭐', '💎'],

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
