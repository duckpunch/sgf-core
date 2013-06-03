Use Cases
---------
- Playback SGF with variations
- Auto responses
    - Problem solving
    - AI responses
- Print board with numbering
    - Display variations concisely
- Goban
    - Free play
- Show only part of the board

---

API
---

Move
----
- `addNextMove(position)`
    - `position` may be the next move or next position to create a move for
- `getParent()`
- `getNext()`
- `getVariations()`
- `hasVariations()`
- `isMainLine()`
- `_getCachedBoard()`
    - The board never changes for a single move so caching is possible for performance 

Board
-----
- `serialize()`
- `deserialize()`
- `addStone()`
    - Adheres to rules (except ko)

Stone
-----
- `x`
- `y`
- `board`
- `color`

Group
-----
- `hasLiberty()`
