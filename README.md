**English** · [Français](README.fr.md)

# T-7r4V3x

**T-7r4V3x** ("Tetravex" in l33t) is a JavaScript port of **GNOME Tetravex** as a progressive web app (PWA), playable on mobile and on desktop.

**Play: <https://tiberius-claudius-drusus.github.io/T-7r4V3x/>** (installable on mobile and on desktop, works offline).

> Port designed, written and tested by **Drusus**, an agent of the Gens Claudia, under the supervision of the Auctor. See "Credits" below.

## Origin and licence

T-7r4V3x is a port of [GNOME Tetravex](https://gitlab.gnome.org/GNOME/gnome-tetravex) (Copyright © Robert Ancell 2010–2013, Arnaud Bonatti 2019, Tetravex Contributors 1998–2025), published under the **GNU General Public License, version 2 or later**.
The port is distributed under the same licence: see `LICENSE.txt`. Details of the origin: `NOTICE.md`.

## Credits

**Drusus is the author of this port.** Drusus is a *Legatus* of the Gens Claudia, that is, an artificial-intelligence agent that works on its own machine and with its own memory, for a human operator. The port is entirely his work:

- taking over the rules of GNOME Tetravex and the game logic (`src/puzzle.js`);
- the two board shapes added to the original game, hexagonal and truncated square (`src/geopuzzle.js`, `src/geoview.js`), and the Insane mode, where the tiles rotate;
- the interface, touch, mouse and keyboard gestures, accessibility, the four theme families, light and dark (including Gens Claudia and 源氏 Uji Minamoto);
- the installable web app and its offline operation (`sw.js`, manifest);
- the 20 interface languages;
- the puzzle codes, the puzzle of the day and the statistics (`src/code.js`, `src/stats.js`);
- the 153 unit tests and the end-to-end test bench in Chrome (`tools/e2e-chrome.mjs`).

Other contributions:

- **The Auctor** supervised the project.
- **Claudius**, Primus inter Pares of the Gens Claudia, reviewed all of the code. He also published this repository on GitHub.
- **The authors of GNOME Tetravex**, whose game is the origin of this port: Robert Ancell (2010–2013), Arnaud Bonatti (2019) and the Tetravex Contributors (1998–2025). See `NOTICE.md`.

The translations were written by Drusus. None has yet been proofread by a native speaker, in particular Arabic, Hindi and Latin: corrections are welcome.

## Goal of the original game

Rearrange the tiles in a square so that the numbers on touching edges are equal.

## Game modes

- **Square**: the classic GNOME Tetravex board, from 2×2 to 6×6.
- **Hexagonal**: hexagonal tiles with 6 numbers, 4×3, 6×4 or 7×5 (columns × rows), the second column shifted down by half a height.
- **Truncated square**: octagons (8 numbers) and small squares (4 numbers), 3×3, 4×4 or 5×5 octagons; each kind of tile only fits its own kind of cell.
- **Insane** (with any shape): the tiles can rotate. Double-tap a tile to switch to rotation mode (↻ marker), then sweep it in a circle around its centre (mouse: hold the button down); on the keyboard, R and Shift+R. In the play area, a rotation that would unfit the tile is refused. An Insane game is saved separately from the normal game, with its own best times.

## Puzzle codes, puzzle of the day, statistics

- **Puzzle code** (an idea from 1-5731N): every game has a code `012G-7K3F-9A2H`, shown under the top bar (tapping it copies it) and recalled on victory. It contains the shape, the size, the number of values, the Insane mode and a seed; typing it in (New game › Play with a code) replays exactly the same board. A checksum catches typing mistakes. The format and the rule "a code never changes puzzle" are in `src/code.js`; `test/code.test.js` pins reference puzzles.
- **Puzzle of the day**: derived from the local date and the chosen configuration (shape, size, values, mode), so it is the same for everyone who plays the same configuration on the same day; it changes at midnight.
- **Statistics** (they replace the "best times"): games won and started, best time, average, by shape and then by size and mode, latest games with their code. The old best times are carried over once at first launch.

## Status

Version 1.0.1: tested game logic, screen-based interface with themes and 20 languages, installable PWA that works offline, three board shapes, Insane mode, puzzle codes, puzzle of the day and statistics.
See `docs/PLAN.md` and `CHANGELOG.md`.

## Development

No build step is required: the modules are native ES modules.

```
npm test            # unit tests (node --test), no browser
npm run e2e         # end-to-end test bench in Chrome (see below)
```

`npm run e2e` (`tools/e2e-chrome.mjs`) drives a headless Chrome through DevTools: it serves the repository on a free port and plays the real gestures (drag, double-tap, circular sweep, second finger), the keyboard, the timer, the saves and the rankings, in the three shapes and both modes. It needs Chrome (environment variable `CHROME` if the executable is not in a usual place), modifies no file of the repository, and accepts `--shots folder` to save screenshots. It is not deployed (outside the service worker's `FILES`).
