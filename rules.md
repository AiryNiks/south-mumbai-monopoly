# Rules — South Mumbai Business Game

---

## Setup

1. Open `index.html` in a modern browser
2. Choose 2–4 players and enter names
3. Click **Start Game**
4. Each player starts with **₹500 Lakhs (₹5 Crores)** and their token on **GO**
5. The first player is chosen at random

---

## Turn Order

On your turn you must:

1. **Roll the dice** (click Roll Dice)
2. **Move** your token the number of spaces shown
3. **Take the action** for the space you land on
4. **End your turn** (click End Turn) when the button becomes active

You cannot end your turn early, and you cannot roll again unless you rolled doubles.

---

## Passing & Landing on GO

- Every time you **pass GO** (position 0) you collect **₹20 Lakhs**
- If you **land directly on GO** you collect **₹20 Lakhs** (not double)
- Loan interest is charged when you pass GO (see Bank Loans)

---

## Doubles

- If both dice show the same number, you rolled **doubles**
- After completing your space action you may **roll again** (the Roll Dice button reactivates)
- Roll doubles **three times in a row** and you are sent directly to **Traffic Jam (Jail)**

---

## Board Spaces

### Properties (Brown, Light Blue, Pink, Orange, Red, Yellow, Green, Dark Blue)

When you land on an **unowned** property:
- You are offered the chance to **buy** it at the listed price
- If you decline, the property goes to **auction** — any player may bid, starting at ₹1L

When you land on a property **owned by another player**:
- You must pay **rent** to the owner (see PROPERTY_REFERENCE.md for rent tables)
- If you cannot afford rent, a **shortfall panel** appears — sell buildings or mortgage properties to raise funds

When you land on your **own** property:
- No action, no rent

When you land on a **mortgaged** property:
- No rent is collected

### Railway Stations (CSMT, Churchgate, Marine Lines, Mumbai Central)

All four stations cost **₹200L**. Rent depends on how many stations the **owner** holds:

| Stations owned | Rent |
|---------------|------|
| 1 | ₹25L |
| 2 | ₹50L |
| 3 | ₹100L |
| 4 | ₹200L |

### Utilities (BEST Electricity, Reliance Energy)

Both utilities cost **₹150L**. Rent is a **multiplier of the dice roll** that caused the landing:

| Utilities owned | Rent |
|----------------|------|
| 1 | 4 × dice roll |
| 2 | 10 × dice roll |

### Tax Spaces

| Space | Effect |
|-------|--------|
| BMC Income Tax (pos 4) | Pay **₹20L flat** or **10% of your total assets** — you choose whichever is lower |
| Sea Link Toll (pos 36) | Pay **₹7.5L** |
| BMC Luxury Cess (pos 38) | Pay **₹10L** |

Total assets = cash + property values (or 50% mortgage value if mortgaged) + building values.

### Mumbai Hustle (Chance) — positions 7, 22, 33

Draw a card from the **Mumbai Hustle** deck. Cards may move you, give you money, charge you money, or grant a Get Out of Jail Free card.

### Townie Gossip (Community Chest) — positions 2, 17

Draw a card from the **Townie Gossip** deck. Similar effects to Mumbai Hustle.

### Corner Spaces

| Space | Effect |
|-------|--------|
| GO (pos 0) | Collect ₹20L |
| Traffic Jam (pos 10) | Just Visiting — no action unless you were sent here |
| Sea View Terrace (pos 20) | Free Parking — no action |
| No-Parking Zone (pos 30) | Go directly to Traffic Jam, do not collect ₹20L |

---

## Traffic Jam (Jail)

You are sent to Traffic Jam when:
- You land on **No-Parking Zone** (pos 30)
- A card says **"Go to Traffic Jam"**
- You roll **doubles three times** in a row

While in Traffic Jam you cannot collect rent on your properties, but you can still buy buildings and manage finances.

### Getting Out

You have three options at the start of your turn in Traffic Jam:

1. **Pay ₹5L bail** (click Pay ₹5L Bail) — then roll normally
2. **Use a Get Out of Jail Free card** (click Use Jail Free Card) — then roll normally
3. **Roll doubles** — if you roll doubles you are released and move that many spaces (no re-roll granted)

If you have not escaped after **3 turns**, you **must pay ₹5L bail** on your third roll, then move.

---

## Monopoly & Buildings

### Monopoly

You own a **monopoly** when you hold all properties of the same colour. Once you have a monopoly:
- **Base rent doubles** on all unimproved properties in that group
- You may begin buying **offices** (houses) and **HQ** (hotels)

### Offices (Houses)

- Cost varies by colour group (see PROPERTY_REFERENCE.md)
- Maximum **4 offices** per property
- **Even-building rule:** you must build evenly across all properties in the group — you cannot place a second office on any property until all properties in the group have one

### HQ (Hotel)

- Once all properties in a group have **4 offices**, you may upgrade any of them to a **HQ**
- Cost varies by colour group (see PROPERTY_REFERENCE.md)
- The 4 offices are returned to the bank supply when a HQ is built

### Selling Buildings

- You may sell offices and HQ back to the bank at any time for **50% of the build cost**
- **Even-selling rule:** you must sell evenly — you cannot sell an office from a property that already has fewer offices than its siblings

---

## Mortgage

- You may mortgage any **unimproved** property at any time for **50% of its purchase price**
- A mortgaged property collects **no rent**
- No buildings may be on a property (or any property in its group) when you mortgage it
- To **unmortgage**, pay back the mortgage value plus **10% interest**

---

## Bank Loans

You can take out loans from the bank at any time:

- Maximum **3 simultaneous loans**, each up to **₹100L**
- Each time you **pass GO**, **10% interest** is added to all outstanding loan balances
- Repay any amount at any time via the **Bank Loans** button

---

## Payment Shortfall

If you cannot afford a payment (rent, tax, or bail):

1. A **Shortfall Panel** appears showing how much more you need
2. You may **sell buildings** or **mortgage properties** to raise the funds
3. You may also take a **bank loan**
4. If you raise enough, the payment clears automatically and your turn continues

If you have **nothing left to sell or mortgage** and still cannot pay, you are **bankrupt**.

---

## Bankruptcy

When a player goes bankrupt:

- All their **properties** are transferred to the creditor (the player or bank they owe)
- All remaining **cash** goes to the creditor
- The bankrupt player is **eliminated** from the game
- If properties are transferred to the **bank**, they are reset and available for purchase again

---

## Winning

The last player remaining with money and properties wins. All other players must be **bankrupt**.

---

## Auctions

When a player declines to buy a property, it goes to auction:

1. Any player (including the one who declined) may bid
2. Select a **bidder** and enter a **bid amount**
3. Minimum opening bid is **₹1L**
4. Click **Confirm Bid** — the property is awarded immediately to the highest bidder
5. The winner pays their bid directly to the bank

---

## Quick Reference

| Rule | Value |
|------|-------|
| Starting cash | ₹500L (₹5 Crores) |
| GO salary | ₹20L |
| Jail bail | ₹5L |
| Max jail turns before forced bail | 3 |
| Income Tax | ₹20L or 10% of assets |
| Sea Link Toll | ₹7.5L |
| BMC Luxury Cess | ₹10L |
| Mortgage value | 50% of purchase price |
| Unmortgage cost | Mortgage value + 10% |
| Max bank loans | 3 × ₹100L |
| Loan interest rate | 10% per GO pass |
| Office sell-back | 50% of office cost |
| HQ sell-back | 50% of HQ cost |
| Auction minimum bid | ₹1L |
