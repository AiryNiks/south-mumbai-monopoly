/**
 * gameState.js — Central state manager.
 *
 * Owns:
 *   players[]         — array of player objects
 *   propertyState{}   — keyed by board position; tracks owner, buildings, mortgage
 *   turnPhase         — current phase in the turn state machine
 *   currentPlayerIdx  — index into players[]
 *   turn              — global turn counter
 *   gameLog[]         — array of log strings
 *   lastDice          — {d1, d2} of the most recent roll
 *   doublesCount      — number of consecutive doubles this turn
 *
 * The state machine prevents illegal actions (e.g. rolling twice, buying
 * when bankrupt, building without a monopoly).
 */

// ── Turn phase constants ───────────────────────────────────────────────────────
const TurnPhase = Object.freeze({
  SETUP:           'SETUP',           // pre-game lobby
  WAITING_ROLL:    'WAITING_ROLL',    // player must roll
  ANIMATING:       'ANIMATING',       // dice/token animation in progress
  SPACE_ACTION:    'SPACE_ACTION',    // evaluating landed space
  BUY_DECISION:    'BUY_DECISION',    // player choosing buy / auction
  JAIL_DECISION:   'JAIL_DECISION',   // player in jail choosing action
  AWAITING_PAY:    'AWAITING_PAY',    // player must pay but is short on cash
  CAN_END_TURN:    'CAN_END_TURN',    // action done; player may end turn
  GAME_OVER:       'GAME_OVER',
});

const GameState = (() => {

  // ── Private state ─────────────────────────────────────────────────────────
  let _state = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function buildInitialPropertyState() {
    const ps = {};
    GAME_CONFIG.BOARD.forEach(space => {
      if (['property', 'railway', 'utility'].includes(space.type)) {
        ps[space.position] = {
          owner:     null,   // player id or null
          mortgaged: false,
          buildings: 0,      // 0=none, 1–4=offices, 5=HQ
        };
      }
    });
    return ps;
  }

  function buildPlayer(id, name) {
    return {
      id,
      name,
      cash:          GAME_CONFIG.STARTING_CASH,
      position:      0,
      properties:    [],      // positions owned
      loans:         [],      // [{principal, interest}]
      jailFreeCards: 0,
      inJail:        false,
      jailTurns:     0,       // turns served (max 3 before forced pay)
      skipTurns:     0,       // card-induced turn skips
      status:        'active', // 'active' | 'bankrupt'
      crrWarned:     false,    // currently below the RBI cash-reserve floor?
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // ── Initialisation ──────────────────────────────────────────────────────

    init(playerNames) {
      _state = {
        players:           playerNames.map((n, i) => buildPlayer(i, n)),
        propertyState:     buildInitialPropertyState(),
        turnPhase:         TurnPhase.WAITING_ROLL,
        currentPlayerIdx:  0,
        turn:              1,
        gameLog:           [],
        lastDice:          { d1: 0, d2: 0 },
        doublesCount:      0,
        pendingSpaceAction: false,
        doubleRentOnCard:  false,
        shortfallAmount:   0,   // how much the current player owes beyond their cash
        shortfallCreditor: null, // player id or null (bank)
        auctionPosition:   null, // position being auctioned
        pendingReroll:     false, // whether current player rolled doubles before a buy/auction decision
        // ── RBI economy ──────────────────────────────────────────────────────
        ledger:            [],   // transaction records (capped at GAME_CONFIG.LEDGER_MAX)
        _txnSeq:           0,    // monotonically increasing ledger id
        repoRate:          GAME_CONFIG.REPO_RATE_START, // current RBI repo rate (%)
        round:             1,    // completed-lap counter (all players = 1 round)
        lastRepoReviewRound: 1,  // last round the RBI reviewed the repo rate
      };
    },

    // ── Accessors (pass-through to private state) ────────────────────────────

    get players()          { return _state.players; },
    get propertyState()    { return _state.propertyState; },
    get turnPhase()        { return _state.turnPhase; },
    set turnPhase(v)       { _state.turnPhase = v; },
    get currentPlayerIdx() { return _state.currentPlayerIdx; },
    get turn()             { return _state.turn; },
    get lastDice()         { return _state.lastDice; },
    set lastDice(v)        { _state.lastDice = v; },
    get doublesCount()     { return _state.doublesCount; },
    set doublesCount(v)    { _state.doublesCount = v; },
    get gameLog()          { return _state.gameLog; },
    get pendingSpaceAction(){ return _state.pendingSpaceAction; },
    set pendingSpaceAction(v){ _state.pendingSpaceAction = v; },
    get doubleRentOnCard() { return _state.doubleRentOnCard; },
    set doubleRentOnCard(v){ _state.doubleRentOnCard = v; },
    get shortfallAmount()  { return _state.shortfallAmount; },
    set shortfallAmount(v) { _state.shortfallAmount = v; },
    get shortfallCreditor(){ return _state.shortfallCreditor; },
    set shortfallCreditor(v){ _state.shortfallCreditor = v; },
    get auctionPosition()  { return _state.auctionPosition; },
    set auctionPosition(v) { _state.auctionPosition = v; },
    get pendingReroll()    { return _state.pendingReroll; },
    set pendingReroll(v)   { _state.pendingReroll = v; },
    get ledger()           { return _state.ledger; },
    get repoRate()         { return _state.repoRate; },
    set repoRate(v)        { _state.repoRate = v; },
    get round()            { return _state.round; },

    // ── Current player convenience ────────────────────────────────────────────

    get currentPlayer() {
      return _state.players[_state.currentPlayerIdx];
    },

    getPlayerById(id) {
      return _state.players.find(p => p.id === id) || null;
    },

    // ── Monopoly check ────────────────────────────────────────────────────────

    /** True if `player` owns every property in `color`. */
    ownsMonopoly(player, color) {
      if (!player) return false;
      return GAME_CONFIG.getColorGroupPositions(color)
        .every(pos => _state.propertyState[pos]?.owner === player.id);
    },

    /** Return all positions owned by a player. */
    getPlayerProperties(player) {
      return player.properties;
    },

    // ── Logging ───────────────────────────────────────────────────────────────

    log(msg) {
      _state.gameLog.push(msg);
      if (_state.gameLog.length > 50) _state.gameLog.shift();
      // Notify UI if available
      if (typeof UI !== 'undefined') UI.appendLog(msg);
    },

    err(msg) {
      if (typeof UI !== 'undefined') UI.toast(msg, 'error');
      if (typeof AUDIO !== 'undefined') AUDIO.errorFeedback();
      return { ok: false, message: msg };
    },

    // ── RBI Digital Ledger ──────────────────────────────────────────────────
    /**
     * Record a transaction in the RBI ledger.
     * @param {object} e
     *   category : 'property' | 'rent' | 'rbi' | 'system'
     *   desc     : human-readable statement line
     *   amount   : value in ₹L (0 for informational entries)
     *   tone     : 'credit' | 'debit' | 'neutral' (default colour in the "All" view)
     *   parties  : [{ id, delta }]  delta>0 = received, delta<0 = paid (for "My" filter)
     */
    recordTxn(e = {}) {
      const now   = new Date();
      const entry = {
        id:       ++_state._txnSeq,
        t:        now.getTime(),
        time:     now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        turn:     _state.turn,
        round:    _state.round,
        category: e.category || 'system',
        desc:     e.desc || '',
        amount:   e.amount || 0,
        tone:     e.tone || 'neutral',
        parties:  (e.parties || []).filter(Boolean),
      };
      _state.ledger.push(entry);
      // Cap at the most recent N entries — auto-evict the oldest.
      const max = GAME_CONFIG.LEDGER_MAX || 100;
      if (_state.ledger.length > max) {
        _state.ledger.splice(0, _state.ledger.length - max);
      }
      if (typeof UI !== 'undefined' && UI.onLedgerUpdate) UI.onLedgerUpdate(entry);
      return entry;
    },

    // ── Dynamic Repo Rate (RBI monetary policy) ───────────────────────────────
    /** Periodically re-set the repo rate within the configured band. */
    reviewRepoRate() {
      const min = GAME_CONFIG.REPO_RATE_MIN;
      const max = GAME_CONFIG.REPO_RATE_MAX;
      const old = _state.repoRate;
      let next  = old, guard = 0;
      do {
        next = Math.round((min + Math.random() * (max - min)) * 4) / 4; // 0.25% steps
        guard++;
      } while (Math.abs(next - old) < 0.75 && guard < 10);
      _state.repoRate = next;

      const dir = next > old ? 'raised' : 'cut';
      this.log(`RBI ${dir} the Repo Rate: ${old}% → ${next}%.`);
      this.recordTxn({
        category: 'rbi', tone: 'neutral', amount: 0,
        desc: `RBI Monetary Policy — Repo Rate ${dir} to ${next}%`,
      });
      if (typeof AUDIO !== 'undefined') AUDIO.play('chime');
      if (typeof UI !== 'undefined') {
        UI.toast(`RBI ${dir} the Repo Rate to ${next}% (was ${old}%).`);
        if (UI.refreshRepoChip) UI.refreshRepoChip();
      }
    },

    // ── CRR (Cash Reserve Ratio) advisory ─────────────────────────────────────
    /** True if a player is below the RBI liquid-cash floor. */
    belowCRR(player) {
      return player && player.status === 'active' &&
             player.cash < GAME_CONFIG.CRR_MINIMUM;
    },

    // ── Turn machine transitions ──────────────────────────────────────────────

    /** Advance to the next player's turn. */
    advanceTurn() {
      _state.doublesCount = 0;
      _state.pendingSpaceAction = false;
      _state.doubleRentOnCard   = false;

      // Skip bankrupt players
      let next = (_state.currentPlayerIdx + 1) % _state.players.length;
      let attempts = 0;
      while (_state.players[next].status !== 'active' && attempts < _state.players.length) {
        next = (next + 1) % _state.players.length;
        attempts++;
      }
      _state.currentPlayerIdx = next;
      _state.turn++;
      _state.turnPhase = TurnPhase.WAITING_ROLL;

      // Round tracking → trigger the periodic RBI repo-rate review.
      const newRound = Math.floor((_state.turn - 1) / _state.players.length) + 1;
      if (newRound > _state.round) {
        _state.round = newRound;
        if (newRound - _state.lastRepoReviewRound >= GAME_CONFIG.REPO_RATE_INTERVAL) {
          _state.lastRepoReviewRound = newRound;
          this.reviewRepoRate();
        }
      }

      // Handle skip-turn effect (e.g. monsoon card)
      const cp = this.currentPlayer;
      if (cp.skipTurns > 0) {
        cp.skipTurns--;
        this.log(`${cp.name} loses a turn (${cp.skipTurns} remaining).`);
        this.advanceTurn();
        return;
      }

      this.log(`Turn ${_state.turn} — ${cp.name}'s turn.`);
    },

    // ── Shortfall / Bankruptcy ────────────────────────────────────────────────

    /**
     * Called by Bank.pay() when a player's cash goes negative.
     * Sets phase to AWAITING_PAY so UI can prompt sell/mortgage actions.
     */
    flagPaymentShortfall(player, amount, creditor) {
      _state.shortfallAmount   = amount;
      // Record the creditor (the player owed) so a bankruptcy hands them the estate.
      // `undefined` means "caller didn't specify"; an explicit null means "the bank".
      if (creditor !== undefined) {
        _state.shortfallCreditor = creditor ? creditor.id : null;
      }
      _state.turnPhase         = TurnPhase.AWAITING_PAY;
      this.log(`${player.name} is ₹${amount}L short! Sell buildings or mortgage properties.`);
    },

    /**
     * Maximum cash a player could still raise from everything they hold:
     * mortgaging un-mortgaged properties + selling buildings back + remaining
     * RBI loan capacity. Used to detect an unrecoverable debt (true insolvency).
     */
    maxRaisable(player) {
      let total = 0;
      (player.properties || []).forEach(pos => {
        const ps  = _state.propertyState[pos];
        const cfg = GAME_CONFIG.getSpace(pos);
        if (!ps || !cfg) return;
        const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
        if (ps.buildings === 5 && grp)      total += Math.floor(grp.hqCost / 2);
        else if (ps.buildings > 0 && grp)   total += ps.buildings * Math.floor(grp.officeCost / 2);
        if (!ps.mortgaged && cfg.mortgage)  total += cfg.mortgage;
      });
      const loanRoom = Math.max(0, GAME_CONFIG.MAX_LOANS - (player.loans || []).length) * GAME_CONFIG.MAX_LOAN_AMOUNT;
      return total + loanRoom;
    },

    /**
     * Check if current shortfall is resolved. If player's cash ≥ 0, clear it.
     * If they still can't afford anything, declare bankruptcy.
     */
    resolveShortfall(player, bank, creditorPlayer) {
      if (player.cash >= 0) {
        _state.shortfallAmount   = 0;
        _state.shortfallCreditor = null;
        _state.turnPhase         = TurnPhase.CAN_END_TURN;
        return;
      }
      // If even fully liquidating everything they own (mortgages + building
      // sales + any remaining loan capacity) cannot return them to solvency, the
      // debt is unrecoverable → declare bankruptcy. This guarantees the turn can
      // always progress and the game never soft-locks on an unpayable debt.
      if (player.cash + this.maxRaisable(player) < 0) {
        this.declareBankruptcy(player, bank, creditorPlayer);
      }
      // Otherwise stay in AWAITING_PAY so the player can raise the cash.
    },

    declareBankruptcy(player, bank, creditorPlayer) {
      player.status = 'bankrupt';
      this.log(`${player.name} has declared BANKRUPTCY!`);

      // Transfer all properties to creditor (or back to bank)
      player.properties.forEach(pos => {
        const ps = _state.propertyState[pos];
        if (creditorPlayer) {
          ps.owner = creditorPlayer.id;
          creditorPlayer.properties.push(pos);
        } else {
          ps.owner     = null;
          ps.mortgaged = false;
          ps.buildings = 0;
        }
      });
      // Transfer remaining cash
      if (creditorPlayer && player.cash > 0) {
        creditorPlayer.cash += player.cash;
      }
      player.cash       = 0;
      player.properties = [];

      // Check for game over
      const active = _state.players.filter(p => p.status === 'active');
      if (active.length === 1) {
        _state.turnPhase = TurnPhase.GAME_OVER;
        this.log(`🏆 ${active[0].name} wins the game!`);
        if (typeof UI !== 'undefined') UI.showGameOver(active[0]);
      } else {
        _state.turnPhase = TurnPhase.CAN_END_TURN;
      }
    },

    // ── Property transaction helpers ──────────────────────────────────────────

    /** Record a direct property purchase (not via auction). */
    buyProperty(player, position, bank) {
      const cfg = GAME_CONFIG.getSpace(position);
      const ps  = _state.propertyState[position];
      if (ps.owner !== null) return this.err('Property already owned.');
      if (player.cash < cfg.price) return this.err(`Need ₹${cfg.price}L.`);

      bank.pay(player, null, cfg.price, this);
      ps.owner = player.id;
      player.properties.push(position);
      this.log(`${player.name} bought ${cfg.name} for ₹${cfg.price}L.`);
      this.recordTxn({
        category: 'property', tone: 'debit', amount: cfg.price,
        desc: `${player.name} purchased ${cfg.name}`,
        parties: [{ id: player.id, delta: -cfg.price }],
      });
      _state.turnPhase = TurnPhase.CAN_END_TURN;
      return { ok: true };
    },

    // ── Jail helpers ──────────────────────────────────────────────────────────

    sendToJail(player) {
      player.position  = 10;
      player.inJail    = true;
      player.jailTurns = 0;
      _state.doublesCount = 0; // reset doubles on jail
      this.log(`${player.name} is sent to Traffic Jam (Jail)!`);
      _state.turnPhase = TurnPhase.CAN_END_TURN;
    },

    /** Attempt to leave jail. Returns {released, paid}. */
    attemptJailEscape(player, bank, method) {
      if (method === 'bail') {
        if (player.cash < GAME_CONFIG.JAIL_BAIL)
          return this.err(`Need ₹${GAME_CONFIG.JAIL_BAIL}L for bail.`);
        bank.pay(player, null, GAME_CONFIG.JAIL_BAIL, this);
        this.recordTxn({
          category: 'system', tone: 'debit', amount: GAME_CONFIG.JAIL_BAIL,
          desc: `${player.name} paid Traffic Jam bail`,
          parties: [{ id: player.id, delta: -GAME_CONFIG.JAIL_BAIL }],
        });
        player.inJail    = false;
        player.jailTurns = 0;
        this.log(`${player.name} paid ₹${GAME_CONFIG.JAIL_BAIL}L bail and is free!`);
        return { ok: true, released: true };
      }
      if (method === 'card') {
        if (!player.jailFreeCards || player.jailFreeCards < 1)
          return this.err('No Get Out of Jail Free card.');
        player.jailFreeCards--;
        player.inJail    = false;
        player.jailTurns = 0;
        this.log(`${player.name} used a Jail Free card!`);
        return { ok: true, released: true };
      }
      return { ok: false };
    },
  };
})();
