# South Mumbai Monopoly Business Game

A Monopoly-style business board game set in historic South Mumbai with colonial-era British street names and iconic landmarks.

## Overview

This game recreates the classic Monopoly experience using South Mumbai locations, featuring authentic British colonial names for roads, landmarks, railway stations, and other points of interest.

## Game Features

- **40 Board Spaces** arranged in classic Monopoly format
- **Properties** representing real South Mumbai locations with British colonial names
- **Currency**: Mumbai Rupees (MR)
- **Player Support**: 2-4 players
- **Objective**: Become the wealthiest player by buying, renting, and trading properties
- **Houses & Hotels**: Build to increase property value
- **Chance & Community Chest**: Random events and opportunities
- **Jail System**: Strategic gameplay element
- **Free Parking, Go to Jail, Go**: Classic Monopoly spaces

## Game Components

1. Game Board (40 spaces)
2. Property Cards (28 properties)
3. Chance Cards (16 cards)
4. Community Chest Cards (16 cards)
5. Game Tokens (4 player pieces)
6. Dice (2 six-sided)
7. Paper Money (denominations: 1, 5, 10, 20, 50, 100, 500 MR)
8. Houses (32 per color)
9. Hotels (12 total)
10. Title Deed Cards

## Board Layout (40 Spaces)

### Corner Spaces (4)
1. **Go** - Start position, collect 200 MR
2. **Go to Jail** - Send to jail or just visiting
3. **Free Parking** - Safe space
4. **Go** (again from start)

### Property Groups (28 Properties)

#### Brown Properties (2)
- Colaba Causeway Road
- Mandai Road

#### Light Blue Properties (3)
- Flora Fountain (King George Circle)
- Horniman Circle
- Apollo Bunder

#### Pink Properties (3)
- Grant Road
- Esplanade
- Fort Street

#### Orange Properties (3)
- Strand Road
- Ballard Pier
- Princess Street

#### Red Properties (3)
- Kala Ghoda
- Ramspart Row
- Meadows Street

#### Yellow Properties (3)
- Frere Road
- Elphinstone Road
- Thackersey Road

#### Green Properties (3)
- Mayo Road
- Bentinck Road
- Lansdowne Road

#### Dark Blue Properties (2)
- Oval Maidan
- The Esplanade

### Railway Stations (4)
- Central Railway Station (Victoria Terminus)
- Fort Railway Station
- Churchgate Railway Station
- Grant Road Railway Station

### Utilities (2)
- Fort Port Authority (Electricity)
- Grant Road Municipality (Water)

### Special Spaces (4)
- Income Tax / Wealth Tax
- Chance (4 spaces on board)
- Community Chest (3 spaces on board)
- Luxury Tax

## File Structure

- `README.md` - Game overview and documentation
- `board_layout.json` - Complete board layout with all 40 spaces
- `properties.json` - Property details including purchase prices and rent
- `railway_stations.json` - Railway station properties
- `utilities.json` - Utility properties
- `cards.json` - Chance and Community Chest cards
- `rules.md` - Complete game rules
- `game_engine.py` - Python game engine
- `ui.html` - Web-based game interface
- `styles.css` - Game UI styling
- `game.js` - Client-side game logic

## How to Play

1. Each player starts with 1500 Mumbai Rupees
2. Players move around the board based on dice rolls
3. Buy properties to build a monopoly
4. Collect rent from opponents
5. Build houses and hotels to increase rent
6. First player to bankrupt all others wins

## Installation & Running

See `rules.md` for detailed game instructions.

---

**Created**: 2026-06-11
**Game Type**: Real Estate Trading Board Game
**Players**: 2-4
**Setup Time**: 10-15 minutes
**Play Time**: 60-180 minutes
