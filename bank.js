/**
 * bank.js — The Bank class.
 *
 * All monetary transactions go through the Bank so there is one authoritative
 * source for money movement. The bank itself never runs out of cash (it prints
 * what it needs), but the house/HQ supply is finite.
 *
 * Key operations:
 *   pay(from, to, amount, gs)  — transfer money (null = bank)
 *   mortgage(player, pos, gs)  — mortgage a property
 *   unmortgage(player, pos, gs)— lift mortgage (costs principal + 10%)
 *   buyOffice(player, pos, gs) — buy 1 office (house) for a property
 *   sellOffice(player, pos, gs)— sell 1 office back to bank for half
 *   buyHQ(player, pos, gs)     — exchange 4 offices for 1 HQ on a property
 *   sellHQ(player, pos, gs)    — sell HQ back, receive 4 offices
 *   grantLoan(player, amount, gs) — issue a bank loan
 *   repayLoan(player, amount, gs) — partial/full repayment
 *   chargePassGoInterest(player, gs) — called when player passes GO
 */

class Bank {
  constructor() {
    this.officesAvailable = GAME_CONFIG.TOTAL_OFFICES;  // 32
    this.hqAvailable      = GAME_CONFIG.TOTAL_HQ;       // 12
  }

  // ── Core money transfer ────────────────────────────────────────────────────

  /**
   * Transfer `amount` (in Lakhs) from `payer` to `payee`.
   * Pass null for either side to mean "the bank".
   * Triggers bankruptcy check when a player's cash goes below 0.
   */
  pay(payer, payee, amount, gs) {
    if (amount <= 0) return { ok: true };

    if (payer !== null) {
      payer.cash -= amount;
    }
    if (payee !== null) {
      payee.cash += amount;
    }

    // Bankruptcy trigger — remember who is owed (payee = creditor; null = bank).
    if (payer !== null && payer.cash < 0) {
      gs.flagPaymentShortfall(payer, Math.abs(payer.cash), payee);
      return { ok: false, shortfall: Math.abs(payer.cash) };
    }
    return { ok: true };
  }

  // ── Mortgage system ────────────────────────────────────────────────────────

  /**
   * Mortgage a property: player receives 50% of its face value.
   * Property must be unimproved (no offices/HQ) and unmortgaged.
   */
  mortgage(player, position, gs) {
    const ps   = gs.propertyState[position];
    const cfg  = GAME_CONFIG.getSpace(position);

    if (!ps || ps.owner !== player.id) return gs.err('You do not own this property.');
    if (ps.mortgaged)                  return gs.err('Already mortgaged.');
    if (ps.buildings > 0)              return gs.err('Sell all buildings first.');

    ps.mortgaged = true;
    this.pay(null, player, cfg.mortgage, gs);
    gs.log(`${player.name} mortgaged ${cfg.name} for ₹${cfg.mortgage}L.`);
    gs.recordTxn({
      category: 'rbi', tone: 'credit', amount: cfg.mortgage,
      desc: `RBI mortgage approved on ${cfg.name}`,
      parties: [{ id: player.id, delta: cfg.mortgage }],
    });
    return { ok: true };
  }

  /**
   * Unmortgage a property: player pays back the mortgage value plus 10% interest.
   */
  unmortgage(player, position, gs) {
    const ps   = gs.propertyState[position];
    const cfg  = GAME_CONFIG.getSpace(position);

    if (!ps || ps.owner !== player.id) return gs.err('You do not own this property.');
    if (!ps.mortgaged)                 return gs.err('Property is not mortgaged.');

    const cost = Math.ceil(cfg.mortgage * (1 + GAME_CONFIG.MORTGAGE_INTEREST));
    if (player.cash < cost) return gs.err(`Need ₹${cost}L to unmortgage. You have ₹${player.cash}L.`);

    this.pay(player, null, cost, gs);
    ps.mortgaged = false;
    gs.log(`${player.name} unmortgaged ${cfg.name} for ₹${cost}L (principal + 10%).`);
    gs.recordTxn({
      category: 'rbi', tone: 'debit', amount: cost,
      desc: `${player.name} cleared mortgage on ${cfg.name}`,
      parties: [{ id: player.id, delta: -cost }],
    });
    return { ok: true };
  }

  // ── Building system ────────────────────────────────────────────────────────

  /**
   * Buy 1 office (house) on a property.
   * Enforces: monopoly ownership, even-building rule, office supply, no mortgage.
   */
  buyOffice(player, position, gs) {
    const ps  = gs.propertyState[position];
    const cfg = GAME_CONFIG.getSpace(position);
    if (!cfg || cfg.type !== 'property') return gs.err('Not a buildable property.');

    const group = GAME_CONFIG.COLOR_GROUPS[cfg.color];
    if (!group) return gs.err('Unknown color group.');

    // Must own full monopoly
    if (!gs.ownsMonopoly(player, cfg.color))
      return gs.err(`You need all ${cfg.color} properties to build.`);

    // No mortgage on any group property
    const groupPos = GAME_CONFIG.getColorGroupPositions(cfg.color);
    if (groupPos.some(p => gs.propertyState[p]?.mortgaged))
      return gs.err('Lift all mortgages in this group before building.');

    if (ps.buildings >= 5)            return gs.err('Already has a HQ (max development).');
    if (ps.buildings === 4)           return gs.err('Convert 4 offices to a HQ instead.');
    if (this.officesAvailable === 0)  return gs.err('No offices available in the bank supply.');

    // Even-building rule: this property must not already have more offices than any sibling
    const minSiblings = Math.min(...groupPos.filter(p => p !== position).map(p => gs.propertyState[p]?.buildings ?? 0));
    if (ps.buildings > minSiblings)
      return gs.err('Must build evenly across all properties in the group.');

    const cost = group.officeCost;
    if (player.cash < cost) return gs.err(`Need ₹${cost}L. You have ₹${player.cash}L.`);

    this.pay(player, null, cost, gs);
    ps.buildings += 1;
    this.officesAvailable -= 1;
    gs.log(`${player.name} built an office on ${cfg.name}. (${ps.buildings}/5)`);
    gs.recordTxn({
      category: 'property', tone: 'debit', amount: cost,
      desc: `${player.name} built an office on ${cfg.name}`,
      parties: [{ id: player.id, delta: -cost }],
    });
    return { ok: true };
  }

  /**
   * Sell 1 office back to the bank for half the build cost.
   * Enforces even-selling rule.
   */
  sellOffice(player, position, gs) {
    const ps  = gs.propertyState[position];
    const cfg = GAME_CONFIG.getSpace(position);
    if (!cfg || cfg.type !== 'property') return gs.err('Not a buildable property.');
    if (!ps || ps.owner !== player.id)   return gs.err('You do not own this property.');
    if (ps.buildings === 0 || ps.buildings === 5) return gs.err('No offices to sell (sell HQ first).');

    const siblings    = GAME_CONFIG.getColorGroupPositions(cfg.color).filter(p => p !== position);
    const maxSiblings = Math.max(0, ...siblings.map(p => gs.propertyState[p]?.buildings ?? 0));
    if (ps.buildings < maxSiblings)
      return gs.err('Must sell evenly — sell from a sibling with more offices first.');

    const refund = Math.floor(GAME_CONFIG.COLOR_GROUPS[cfg.color].officeCost / 2);
    this.pay(null, player, refund, gs);
    ps.buildings -= 1;
    this.officesAvailable += 1;
    gs.log(`${player.name} sold an office on ${cfg.name} for ₹${refund}L.`);
    gs.recordTxn({
      category: 'property', tone: 'credit', amount: refund,
      desc: `${player.name} sold an office on ${cfg.name}`,
      parties: [{ id: player.id, delta: refund }],
    });
    return { ok: true };
  }

  /**
   * Upgrade 4 offices → 1 HQ on a single property.
   * All siblings must also have 4 offices first.
   */
  buyHQ(player, position, gs) {
    const ps  = gs.propertyState[position];
    const cfg = GAME_CONFIG.getSpace(position);
    if (!cfg || cfg.type !== 'property') return gs.err('Not a buildable property.');
    if (!ps || ps.owner !== player.id)   return gs.err('You do not own this property.');
    if (ps.buildings !== 4)              return gs.err('Need exactly 4 offices to build a HQ.');
    if (this.hqAvailable === 0)          return gs.err('No HQ tokens available in bank supply.');

    // All siblings must have 4 offices
    const siblings = GAME_CONFIG.getColorGroupPositions(cfg.color).filter(p => p !== position);
    if (siblings.some(p => gs.propertyState[p]?.buildings < 4))
      return gs.err('All properties in this group must have 4 offices before upgrading to HQ.');

    const cost = GAME_CONFIG.COLOR_GROUPS[cfg.color].hqCost;
    if (player.cash < cost) return gs.err(`Need ₹${cost}L. You have ₹${player.cash}L.`);

    this.pay(player, null, cost, gs);
    ps.buildings = 5;              // 5 = HQ
    this.officesAvailable += 4;   // 4 houses returned to supply
    this.hqAvailable -= 1;
    gs.log(`${player.name} upgraded ${cfg.name} to a HQ!`);
    gs.recordTxn({
      category: 'property', tone: 'debit', amount: cost,
      desc: `${player.name} built Headquarters on ${cfg.name}`,
      parties: [{ id: player.id, delta: -cost }],
    });
    return { ok: true };
  }

  /**
   * Sell HQ back: player receives half the HQ cost.
   * 4 office tokens re-issued if available, otherwise bank issues IOUs.
   */
  sellHQ(player, position, gs) {
    const ps  = gs.propertyState[position];
    const cfg = GAME_CONFIG.getSpace(position);
    if (!ps || ps.owner !== player.id) return gs.err('You do not own this property.');
    if (ps.buildings !== 5)            return gs.err('No HQ on this property.');

    // We need 4 offices to replace it; if supply is short the player must wait
    // (standard Monopoly rule — we'll allow it here for playability and note the shortage)
    const refund = Math.floor(GAME_CONFIG.COLOR_GROUPS[cfg.color].hqCost / 2);
    this.pay(null, player, refund, gs);
    ps.buildings = 4;
    this.hqAvailable += 1;
    this.officesAvailable = Math.max(0, this.officesAvailable - 4);
    gs.log(`${player.name} sold the HQ on ${cfg.name} for ₹${refund}L (4 offices placed).`);
    gs.recordTxn({
      category: 'property', tone: 'credit', amount: refund,
      desc: `${player.name} sold the HQ on ${cfg.name}`,
      parties: [{ id: player.id, delta: refund }],
    });
    return { ok: true };
  }

  // ── Loan system ────────────────────────────────────────────────────────────

  /**
   * Grant a bank loan to a player.
   * Max GAME_CONFIG.MAX_LOANS simultaneous loans, each ≤ MAX_LOAN_AMOUNT.
   */
  grantLoan(player, amount, gs) {
    const loans = player.loans || [];
    if (loans.length >= GAME_CONFIG.MAX_LOANS)
      return gs.err(`You already have ${GAME_CONFIG.MAX_LOANS} active loans.`);
    if (!Number.isFinite(amount) || amount <= 0)
      return gs.err('Loan amount must be positive.');
    if (amount > GAME_CONFIG.MAX_LOAN_AMOUNT)
      return gs.err(`Max loan amount is ₹${GAME_CONFIG.MAX_LOAN_AMOUNT}L.`);

    // Lock the interest rate at the repo rate prevailing when the loan is taken —
    // so timing your borrowing against the RBI Repo Rate genuinely matters.
    const rate = (gs.repoRate != null) ? gs.repoRate : (GAME_CONFIG.LOAN_INTEREST * 100);
    const loan = { principal: amount, interest: 0, rate };
    player.loans = loans.concat(loan);
    this.pay(null, player, amount, gs);
    gs.log(`${player.name} took a ₹${amount}L RBI loan at ${rate}% (repo-linked).`);
    gs.recordTxn({
      category: 'rbi', tone: 'credit', amount,
      desc: `RBI loan disbursed to ${player.name} @ ${rate}%`,
      parties: [{ id: player.id, delta: amount }],
    });
    return { ok: true, loan };
  }

  /**
   * Repay some or all outstanding loan balance.
   */
  repayLoan(player, amount, gs) {
    const loans = player.loans || [];
    if (loans.length === 0) return gs.err('You have no active loans.');
    if (!Number.isFinite(amount) || amount <= 0) return gs.err('Enter a valid repayment amount.');
    // Never collect more than is actually owed — cap the payment at the total debt.
    const totalOwed = loans.reduce((s, l) => s + l.principal + l.interest, 0);
    amount = Math.min(amount, totalOwed);
    if (player.cash < amount) return gs.err(`Need ₹${amount}L. You have ₹${player.cash}L.`);

    let remaining = amount;
    // Pay off loans in order (oldest first)
    for (let i = 0; i < loans.length && remaining > 0; i++) {
      const owed = loans[i].principal + loans[i].interest;
      const paid = Math.min(remaining, owed);
      remaining -= paid;
      const reduction = paid;
      // First clear interest, then principal
      const intCleared = Math.min(paid, loans[i].interest);
      loans[i].interest -= intCleared;
      loans[i].principal -= (paid - intCleared);
    }
    // Remove fully repaid loans
    player.loans = loans.filter(l => l.principal + l.interest > 0.001);
    this.pay(player, null, amount, gs);
    gs.log(`${player.name} repaid ₹${amount}L toward RBI loans.`);
    gs.recordTxn({
      category: 'rbi', tone: 'debit', amount,
      desc: `${player.name} repaid RBI loan`,
      parties: [{ id: player.id, delta: -amount }],
    });
    return { ok: true };
  }

  /**
   * Called each time a player passes GO.
   * Adds 10% interest to all outstanding loans.
   */
  chargePassGoInterest(player, gs) {
    const loans = player.loans || [];
    if (loans.length === 0) return;
    let totalInterest = 0;
    loans.forEach(l => {
      // Each loan accrues at its own locked repo-linked rate.
      const ratePct  = (l.rate != null) ? l.rate : (GAME_CONFIG.LOAN_INTEREST * 100);
      const interest = Math.ceil(l.principal * ratePct / 100);
      l.interest += interest;
      totalInterest += interest;
    });
    if (totalInterest > 0) {
      gs.log(`${player.name} accrued ₹${totalInterest}L RBI loan interest (pass-GO).`);
      gs.recordTxn({
        category: 'rbi', tone: 'debit', amount: totalInterest,
        desc: `RBI loan interest accrued for ${player.name}`,
        parties: [{ id: player.id, delta: -totalInterest }],
      });
    }
  }

  // ── Forced settlement ──────────────────────────────────────────────────────

  /**
   * Forcibly raise cash for a player who owes money outside their own turn
   * (e.g. a card makes every opponent pay the drawer — they can never reach the
   * shortfall UI on someone else's turn). Sells buildings back at half price,
   * then mortgages properties, until cash ≥ 0 or nothing is left to liquidate.
   * The even-building rule is waived — this is a distress sale.
   */
  autoLiquidate(player, gs) {
    const props = (player.properties || []).slice();
    // 1. Sell buildings back (HQ first, then offices).
    for (const pos of props) {
      if (player.cash >= 0) break;
      const ps  = gs.propertyState[pos];
      const cfg = GAME_CONFIG.getSpace(pos);
      const grp = cfg ? GAME_CONFIG.COLOR_GROUPS[cfg.color] : null;
      if (!ps || !grp || !ps.buildings) continue;
      if (ps.buildings === 5) {
        this.pay(null, player, Math.floor(grp.hqCost / 2), gs);
        ps.buildings = 4;
        this.hqAvailable += 1;
        this.officesAvailable = Math.max(0, this.officesAvailable - 4);
      }
      while (player.cash < 0 && ps.buildings > 0) {
        this.pay(null, player, Math.floor(grp.officeCost / 2), gs);
        ps.buildings -= 1;
        this.officesAvailable += 1;
      }
    }
    // 2. Mortgage whatever is still unmortgaged.
    for (const pos of props) {
      if (player.cash >= 0) break;
      const ps  = gs.propertyState[pos];
      const cfg = GAME_CONFIG.getSpace(pos);
      if (!ps || ps.mortgaged || ps.buildings > 0 || !cfg || !cfg.mortgage) continue;
      ps.mortgaged = true;
      this.pay(null, player, cfg.mortgage, gs);
    }
    if (player.cash >= 0) {
      gs.log(`${player.name} liquidated assets to settle the debt.`);
    }
  }

  // ── Rent calculation ───────────────────────────────────────────────────────

  /**
   * Calculate rent owed when `lander` lands on `position`.
   * `diceTotal` needed for utility rent.
   */
  calcRent(lander, position, diceTotal, gs) {
    const ps  = gs.propertyState[position];
    const cfg = GAME_CONFIG.getSpace(position);
    if (!ps || ps.owner === null || ps.mortgaged) return 0;
    if (ps.owner === lander.id) return 0;

    if (cfg.type === 'property') {
      let rent = cfg.rent[ps.buildings]; // 0=base, 1–4=offices, 5=HQ
      // Double rent if owner has monopoly and property is unimproved
      if (ps.buildings === 0 && gs.ownsMonopoly(gs.getPlayerById(ps.owner), cfg.color)) {
        rent *= 2;
      }
      // Card flag: double rent (nearest railway card)
      if (gs.doubleRentOnCard) {
        rent *= 2;
        gs.doubleRentOnCard = false;
      }
      return rent;
    }

    if (cfg.type === 'railway') {
      const owner       = gs.getPlayerById(ps.owner);
      const ownedCount  = GAME_CONFIG.getRailwayPositions()
        .filter(p => gs.propertyState[p]?.owner === owner.id).length;
      let rent = cfg.rent[ownedCount - 1];
      if (gs.doubleRentOnCard) { rent *= 2; gs.doubleRentOnCard = false; }
      return rent;
    }

    if (cfg.type === 'utility') {
      const owner      = gs.getPlayerById(ps.owner);
      const ownedCount = GAME_CONFIG.getUtilityPositions()
        .filter(p => gs.propertyState[p]?.owner === owner.id).length;
      return cfg.rentMultiplier[ownedCount - 1] * diceTotal;
    }

    return 0;
  }

  // ── Auction ────────────────────────────────────────────────────────────────

  /**
   * Begin an auction for an unowned property that a player declined to buy.
   * The UI module handles the bidding UI; this validates the final bid.
   */
  completeAuction(winner, position, bidAmount, gs) {
    if (winner.cash < bidAmount) return gs.err('Insufficient funds for auction bid.');
    this.pay(winner, null, bidAmount, gs);
    gs.propertyState[position].owner = winner.id;
    const cfg = GAME_CONFIG.getSpace(position);
    winner.properties.push(position);
    gs.log(`${winner.name} won auction for ${cfg.name} at ₹${bidAmount}L.`);
    gs.recordTxn({
      category: 'property', tone: 'debit', amount: bidAmount,
      desc: `${cfg.name} won at auction by ${winner.name}`,
      parties: [{ id: winner.id, delta: -bidAmount }],
    });
    return { ok: true };
  }
}
