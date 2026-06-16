/**
 * cards.js — Card deck system.
 *
 * Two decks:
 *   "Mumbai Hustle"  (replaces Chance)         — action-oriented, high variance
 *   "Townie Gossip"  (replaces Community Chest) — luck/social flavour
 *
 * Each card has:
 *   id       — unique string
 *   title    — short headline shown on the card face
 *   text     — full flavour text
 *   action   — function(player, gameState, bank, ui) executed on draw
 *
 * Decks are shuffled at game start. Drawn cards go to the bottom of the deck.
 * "Get out of Jail Free" cards are tracked separately and returned when used.
 */

const CARDS = (() => {

  // ── Helpers inside closure ─────────────────────────────────────────────────

  /** Fisher-Yates shuffle (mutates array). */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Advance a player to a target position; collect ₹20L if they pass GO. */
  function advanceTo(position, player, gameState, bank) {
    const oldPos = player.position;
    player.position = position;
    if (position < oldPos) {
      // Passed GO
      bank.pay(null, player, GAME_CONFIG.GO_SALARY, gameState);
      gameState.log(`${player.name} passed GO — collected ₹${GAME_CONFIG.GO_SALARY}L`);
    }
  }

  /** Advance to nearest railway. Collects GO salary if board wraps. */
  function advanceToNearestRailway(player, gameState, bank) {
    const railPos = GAME_CONFIG.getRailwayPositions(); // [5,14,25,35]
    let nearest = railPos.find(p => p > player.position);
    const wraps = nearest === undefined;
    if (wraps) nearest = railPos[0];
    advanceTo(nearest, player, gameState, bank);
    return nearest;
  }

  // ── Mumbai Hustle deck (16 cards) ──────────────────────────────────────────
  function buildHustleDeck() {
    return [
      {
        id: 'h1',
        title: 'Advance to GO',
        text: 'Your taxi somehow beats the traffic. Advance to GO and collect ₹20L.',
        action(player, gs, bank, ui) {
          advanceTo(0, player, gs, bank);
          bank.pay(null, player, GAME_CONFIG.GO_SALARY, gs);
          gs.log(`${player.name} advanced to GO and collected ₹${GAME_CONFIG.GO_SALARY}L.`);
          ui.toast(`${player.name} → GO! +₹${GAME_CONFIG.GO_SALARY}L`);
        },
      },
      {
        id: 'h2',
        title: 'Sea Link Shortcut',
        text: 'Skip the traffic by taking the Sea Link — advance to Worli Sea Face (pos 24).',
        action(player, gs, bank, ui) {
          advanceTo(24, player, gs, bank);
          gs.log(`${player.name} took the Sea Link and advanced to Worli Sea Face.`);
          ui.toast(`${player.name} → Worli Sea Face!`);
          // Space action handled by main controller after card resolves
          gs.pendingSpaceAction = true;
        },
      },
      {
        id: 'h3',
        title: 'Advance to Churchgate',
        text: 'Board the fast train. Advance to Churchgate Station (pos 14).',
        action(player, gs, bank, ui) {
          advanceTo(14, player, gs, bank);
          gs.log(`${player.name} advanced to Churchgate Station.`);
          ui.toast(`${player.name} → Churchgate!`);
          gs.pendingSpaceAction = true;
        },
      },
      {
        id: 'h4',
        title: 'Nearest Railway',
        text: 'Mumbai moves by train. Advance to the nearest railway station and pay double rent if owned.',
        action(player, gs, bank, ui) {
          const pos = advanceToNearestRailway(player, gs, bank);
          gs.log(`${player.name} advanced to nearest railway (pos ${pos}).`);
          ui.toast(`${player.name} → nearest railway!`);
          gs.pendingSpaceAction = true;
          gs.doubleRentOnCard = true; // flag for main controller
        },
      },
      {
        id: 'h5',
        title: 'Traffic Jam!',
        text: 'Stuck behind a BEST bus. Go directly to Traffic Jam — do not collect ₹20L.',
        action(player, gs, bank, ui) {
          player.position = 10;
          player.inJail = true;
          player.jailTurns = 0;
          gs.log(`${player.name} is stuck in Traffic Jam (Jail)!`);
          ui.toast(`${player.name} → Traffic Jam!`);
        },
      },
      {
        id: 'h6',
        title: 'Go Back 3 Spaces',
        text: 'Wrong turn at Haji Ali. Go back 3 spaces.',
        action(player, gs, bank, ui) {
          player.position = (player.position - 3 + 40) % 40;
          gs.log(`${player.name} went back 3 spaces to pos ${player.position}.`);
          ui.toast(`${player.name} went back 3 spaces!`);
          gs.pendingSpaceAction = true;
        },
      },
      {
        id: 'h7',
        title: 'BMC Repairs',
        text: 'Heritage property maintenance order from BMC. Pay ₹25L per office, ₹100L per HQ.',
        action(player, gs, bank, ui) {
          const props = gs.getPlayerProperties(player);
          let cost = 0;
          props.forEach(pos => {
            const ps = gs.propertyState[pos];
            if (ps) cost += ps.buildings < 5 ? ps.buildings * 25 : 100;
          });
          if (cost === 0) cost = 0;
          gs.log(`${player.name} paid ₹${cost}L for BMC repairs.`);
          ui.toast(`BMC Repairs: -₹${cost}L`);
          bank.pay(player, null, cost, gs);
        },
      },
      {
        id: 'h8',
        title: 'Startup Funded!',
        text: 'Your pitch at NSRCEL landed ₹50L seed funding. Collect from the bank.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 50, gs);
          gs.log(`${player.name} collected ₹50L seed funding.`);
          ui.toast(`Startup funded! +₹50L`);
        },
      },
      {
        id: 'h9',
        title: 'Diwali Bonus',
        text: 'Your property managers gifted you ₹20L each. Collect from every other player.',
        action(player, gs, bank, ui) {
          const others = gs.players.filter(p => p !== player && p.status === 'active');
          others.forEach(other => bank.pay(other, player, 20, gs));
          gs.log(`${player.name} collected Diwali bonuses: ₹${20 * others.length}L total.`);
          ui.toast(`Diwali! +₹${20 * others.length}L from opponents`);
        },
      },
      {
        id: 'h10',
        title: 'Property Tax Demand',
        text: 'BMC issues a property tax demand. Pay ₹10L per property you own.',
        action(player, gs, bank, ui) {
          const count = gs.getPlayerProperties(player).length;
          const cost = count * 10;
          bank.pay(player, null, cost, gs);
          gs.log(`${player.name} paid ₹${cost}L property tax (${count} properties).`);
          ui.toast(`Property Tax: -₹${cost}L`);
        },
      },
      {
        id: 'h11',
        title: 'Get Out of Jail Free',
        text: 'You know the right people. Keep this card until you need it.',
        isJailFree: true,
        action(player, gs, bank, ui) {
          player.jailFreeCards = (player.jailFreeCards || 0) + 1;
          gs.log(`${player.name} received a Get Out of Jail Free card.`);
          ui.toast(`${player.name} got a Jail Free card!`);
        },
      },
      {
        id: 'h12',
        title: 'Advance to Kala Ghoda',
        text: 'Art Basel invites you. Advance to Kala Ghoda (pos 21).',
        action(player, gs, bank, ui) {
          advanceTo(21, player, gs, bank);
          gs.log(`${player.name} advanced to Kala Ghoda.`);
          ui.toast(`${player.name} → Kala Ghoda!`);
          gs.pendingSpaceAction = true;
        },
      },
      {
        id: 'h13',
        title: 'Monsoon Flooding',
        text: 'Waterlogging damaged your ground floor. Pay ₹20L for emergency repairs.',
        action(player, gs, bank, ui) {
          bank.pay(player, null, 20, gs);
          gs.log(`${player.name} paid ₹20L for monsoon flood repairs.`);
          ui.toast(`Monsoon flooding! -₹20L`);
        },
      },
      {
        id: 'h14',
        title: 'Insurance Premium',
        text: 'Annual property insurance premium due. Pay ₹25L.',
        action(player, gs, bank, ui) {
          bank.pay(player, null, 25, gs);
          gs.log(`${player.name} paid ₹25L insurance premium.`);
          ui.toast(`Insurance: -₹25L`);
        },
      },
      {
        id: 'h15',
        title: 'Luxury Brand Lease',
        text: 'A global luxury brand signed a lease in your commercial space. Collect ₹100L from the bank.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 100, gs);
          gs.log(`${player.name} collected ₹100L from luxury brand lease.`);
          ui.toast(`Luxury lease! +₹100L`);
        },
      },
      {
        id: 'h16',
        title: 'Development Approval',
        text: 'Your FSI proposal was approved. Collect ₹50L from the bank.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 50, gs);
          gs.log(`${player.name} received ₹50L development approval bonus.`);
          ui.toast(`Dev approval! +₹50L`);
        },
      },
    ];
  }

  // ── Townie Gossip deck (16 cards) ─────────────────────────────────────────
  function buildGossipDeck() {
    return [
      {
        id: 'g1',
        title: 'Bank Error in Your Favour',
        text: "The bank's reconciliation found ₹20L in your account. Collect from the bank.",
        action(player, gs, bank, ui) {
          bank.pay(null, player, 20, gs);
          gs.log(`${player.name} collected ₹20L — bank error in their favour.`);
          ui.toast(`Bank error! +₹20L`);
        },
      },
      {
        id: 'g2',
        title: 'Kala Ghoda Art Exhibition',
        text: 'You hosted a successful gallery show at Kala Ghoda. Collect ₹20L from each player.',
        action(player, gs, bank, ui) {
          const others = gs.players.filter(p => p !== player && p.status === 'active');
          others.forEach(other => bank.pay(other, player, 20, gs));
          gs.log(`${player.name} collected ₹20L from each player — art exhibition success!`);
          ui.toast(`Art exhibition! +₹${20 * others.length}L`);
        },
      },
      {
        id: 'g3',
        title: 'Stuck in Monsoon',
        text: 'Waist-deep water at Hind Mata. Lose 1 turn.',
        action(player, gs, bank, ui) {
          player.skipTurns = (player.skipTurns || 0) + 1;
          gs.log(`${player.name} is stuck in monsoon flooding — loses 1 turn.`);
          ui.toast(`Monsoon! ${player.name} loses a turn.`);
        },
      },
      {
        id: 'g4',
        title: 'Heritage Conservation Award',
        text: 'Your restored heritage building wins a UNESCO award. Collect ₹100L from the bank.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 100, gs);
          gs.log(`${player.name} won a Heritage Award and collected ₹100L.`);
          ui.toast(`Heritage Award! +₹100L`);
        },
      },
      {
        id: 'g5',
        title: 'BMC Drainage Bill',
        text: "Your street's drainage is your responsibility this monsoon. Pay ₹50L.",
        action(player, gs, bank, ui) {
          bank.pay(player, null, 50, gs);
          gs.log(`${player.name} paid ₹50L BMC drainage bill.`);
          ui.toast(`BMC Drainage: -₹50L`);
        },
      },
      {
        id: 'g6',
        title: 'Mutual Fund Matures',
        text: "Your grandfather's SIP finally matured. Collect ₹100L from the bank.",
        action(player, gs, bank, ui) {
          bank.pay(null, player, 100, gs);
          gs.log(`${player.name} collected ₹100L from a matured mutual fund.`);
          ui.toast(`Mutual fund matured! +₹100L`);
        },
      },
      {
        id: 'g7',
        title: 'Income Tax Refund',
        text: 'Your CA actually filed on time. Income tax refund of ₹20L — collect from the bank.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 20, gs);
          gs.log(`${player.name} received a ₹20L income tax refund.`);
          ui.toast(`Tax refund! +₹20L`);
        },
      },
      {
        id: 'g8',
        title: 'Breach Candy Hospital Bill',
        text: 'Emergency treatment at Breach Candy Hospital. Pay ₹50L.',
        action(player, gs, bank, ui) {
          bank.pay(player, null, 50, gs);
          gs.log(`${player.name} paid ₹50L hospital bill.`);
          ui.toast(`Hospital bill: -₹50L`);
        },
      },
      {
        id: 'g9',
        title: 'Annual Property Inspection',
        text: 'Municipal inspector visits all your properties. Pay ₹40L in compliance fees.',
        action(player, gs, bank, ui) {
          bank.pay(player, null, 40, gs);
          gs.log(`${player.name} paid ₹40L in property inspection fees.`);
          ui.toast(`Inspection fee: -₹40L`);
        },
      },
      {
        id: 'g10',
        title: 'Stock Market Windfall',
        text: 'Reliance shares in your demat account surged. Collect ₹50L.',
        action(player, gs, bank, ui) {
          bank.pay(null, player, 50, gs);
          gs.log(`${player.name} collected ₹50L from stock market gains.`);
          ui.toast(`Stock windfall! +₹50L`);
        },
      },
      {
        id: 'g11',
        title: 'Traffic Jam!',
        text: "You got stuck behind a BJP rally at Azad Maidan. Go directly to Traffic Jam.",
        action(player, gs, bank, ui) {
          player.position = 10;
          player.inJail = true;
          player.jailTurns = 0;
          gs.log(`${player.name} went to Traffic Jam (Jail)!`);
          ui.toast(`${player.name} → Traffic Jam!`);
        },
      },
      {
        id: 'g12',
        title: 'Get Out of Jail Free',
        text: 'You have friends in high places. Keep this card until you need it.',
        isJailFree: true,
        action(player, gs, bank, ui) {
          player.jailFreeCards = (player.jailFreeCards || 0) + 1;
          gs.log(`${player.name} received a Get Out of Jail Free card.`);
          ui.toast(`${player.name} got a Jail Free card!`);
        },
      },
      {
        id: 'g13',
        title: 'Life Insurance Matures',
        text: "Your LIC policy matures. Collect ₹100L from the bank.",
        action(player, gs, bank, ui) {
          bank.pay(null, player, 100, gs);
          gs.log(`${player.name} collected ₹100L from an LIC policy.`);
          ui.toast(`LIC matures! +₹100L`);
        },
      },
      {
        id: 'g14',
        title: 'Don Bosco School Fees',
        text: "Your kids' annual school fees are due. Pay ₹50L.",
        action(player, gs, bank, ui) {
          bank.pay(player, null, 50, gs);
          gs.log(`${player.name} paid ₹50L school fees.`);
          ui.toast(`School fees: -₹50L`);
        },
      },
      {
        id: 'g15',
        title: 'Advance to GO',
        text: 'Your driver finally figured out Google Maps. Advance to GO and collect ₹20L.',
        action(player, gs, bank, ui) {
          advanceTo(0, player, gs, bank);
          bank.pay(null, player, GAME_CONFIG.GO_SALARY, gs);
          gs.log(`${player.name} advanced to GO and collected ₹${GAME_CONFIG.GO_SALARY}L.`);
          ui.toast(`${player.name} → GO! +₹${GAME_CONFIG.GO_SALARY}L`);
        },
      },
      {
        id: 'g16',
        title: 'Community Fundraiser',
        text: 'You organised a Ganesh festival fundraiser. Pay ₹20L to the community fund (bank).',
        action(player, gs, bank, ui) {
          bank.pay(player, null, 20, gs);
          gs.log(`${player.name} donated ₹20L to the community fundraiser.`);
          ui.toast(`Fundraiser: -₹20L`);
        },
      },
    ];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  let hustleDeck = [];
  let gossipDeck = [];

  /**
   * Record every per-player cash change a card caused into the RBI ledger, and
   * play an income chime for the drawer if they came out ahead. Diffing before/
   * after captures all flavour cards (gifts, fines, collect-from-all) without
   * having to annotate each of the 32 card actions individually.
   */
  function recordCardDeltas(deckName, card, drawer, gs, before) {
    if (!gs || typeof gs.recordTxn !== 'function') return;
    gs.players.forEach((p, i) => {
      const delta = p.cash - before[i];
      if (Math.abs(delta) < 0.001) return;
      gs.recordTxn({
        category: 'system',
        tone:     delta > 0 ? 'credit' : 'debit',
        amount:   Math.abs(delta),
        desc:     `${deckName}: ${card.title} — ${p.name}`,
        parties:  [{ id: p.id, delta }],
      });
    });
    if (typeof AUDIO !== 'undefined') {
      const idx = gs.players.indexOf(drawer);
      const d   = idx >= 0 ? drawer.cash - before[idx] : 0;
      if (d > 0) AUDIO.play('cash');
    }
  }

  return {
    /** Call at game start — creates and shuffles both decks. */
    init() {
      hustleDeck = shuffle(buildHustleDeck());
      gossipDeck = shuffle(buildGossipDeck());
    },

    /** Draw the top Mumbai Hustle card, move it to the bottom, execute its action. */
    drawHustle(player, gameState, bank, ui) {
      if (hustleDeck.length === 0) hustleDeck = shuffle(buildHustleDeck());
      const card = hustleDeck.shift();
      // Jail-Free cards stay with player, not returned to deck until used
      if (!card.isJailFree) hustleDeck.push(card);
      ui.showCard('Mumbai Hustle', card);
      const before = gameState.players.map(p => p.cash);
      card.action(player, gameState, bank, ui);
      recordCardDeltas('Mumbai Hustle', card, player, gameState, before);
      return card;
    },

    /** Draw the top Townie Gossip card, move it to the bottom, execute its action. */
    drawGossip(player, gameState, bank, ui) {
      if (gossipDeck.length === 0) gossipDeck = shuffle(buildGossipDeck());
      const card = gossipDeck.shift();
      if (!card.isJailFree) gossipDeck.push(card);
      ui.showCard('Townie Gossip', card);
      const before = gameState.players.map(p => p.cash);
      card.action(player, gameState, bank, ui);
      recordCardDeltas('Townie Gossip', card, player, gameState, before);
      return card;
    },

    /** Return a Jail-Free card to the bottom of its deck when used. */
    returnJailFreeCard(deck) {
      const fakeCard = deck === 'hustle'
        ? buildHustleDeck().find(c => c.id === 'h11')
        : buildGossipDeck().find(c => c.id === 'g12');
      if (deck === 'hustle') hustleDeck.push(fakeCard);
      else gossipDeck.push(fakeCard);
    },
  };
})();
