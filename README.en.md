# Acorn Expedition · 橡果远征

**Pull back the branch slingshot, send your acorn companions into the forest, and recover the Acorn Kingdom's winter supplies.**

An original physics adventure game independently created by [myflww](https://github.com/myflww). This repository contains the standalone source-available desktop game extracted from Luma. It uses native JavaScript, HTML5 Canvas and Web Audio, with no third-party npm dependencies. Luma, API keys and user accounts are not required.

[简体中文](README.md) · [Attribution](ATTRIBUTION.md) · [Noncommercial license](LICENSE)

**Source available · Noncommercial use only · Preserve credit to myflww and the original project.** This project uses PolyForm Noncommercial License 1.0.0; it is not OSI-standard open source.

## What's inside

- 18 main-story stages, 20 stages across five secret campaigns, endless expeditions and a daily three-stage challenge.
- Active acorn abilities, enemies, material interactions, connected structures and environmental rules.
- Upgradeable and fusible talents, special acorns, supply rewards and star ratings.
- Separate stage-start checkpoints and local expedition records.

The game interface is in Chinese.

## Run locally

Install [Node.js 20 or newer](https://nodejs.org/). Download and extract **Code → Download ZIP**, open a terminal in the extracted directory and run `npm run dev`. Alternatively:

```bash
git clone https://github.com/myflww/acorn-expedition.git
cd acorn-expedition
npm run dev
```

Open **http://127.0.0.1:4187/**. There are no external npm dependencies; `npm install` is unnecessary. Do not open `index.html` directly, because browsers may block ES Modules under `file://`. The local server binds to loopback only.

On macOS/Linux, choose a different port with `ACORN_PORT=4188 npm run dev`. In PowerShell, set `$env:ACORN_PORT=4188` before running `npm run dev`, then open that port.

Drag and release the acorn on the slingshot to launch. Click during flight or press `Space` for its ability. Arrow keys adjust aim, `Enter` launches, `P` pauses, `R` restarts, `Esc` opens settings/pause, the wheel zooms, and `M` toggles mute. A desktop viewport of at least 1280×720 is recommended.

## Data and dependencies

Progress is stored in the current browser origin's `localStorage`. Different domains, ports, browsers or profiles have separate saves, as does the version inside Luma. Clearing site data may erase progress. There is no cloud save, login, analytics or model service. Graphics and audio are drawn or synthesized locally; production game code does not make external network requests. Author/source links open GitHub only when clicked.

The repository contains native JavaScript source, HTML/CSS, a Node built-in static server and tests. It does not distribute Luma's characters, scene assets, models or other games.

## Development

```bash
npm test
npm run check
```

The existing suite covers mechanics, levels, talents, checkpoints, saves, browser isolation and more. Automated checks complement playtesting; they do not prove that every level is balanced. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Noncommercial license and source credit

Copyright 2026 **myflww**. Code and included first-party game content use the unchanged **[PolyForm Noncommercial License 1.0.0](LICENSE)**. Noncommercial play, study, modification and sharing are permitted under its terms. **Commercial use is not authorized.** Selling the game, paid distribution, advertising monetization and integration into commercial products are typical commercial uses. The complete English license controls.

When distributing any part, give recipients the license terms or the [official license URL](https://polyformproject.org/licenses/noncommercial/1.0.0), together with all supplied `Required Notice:` plain-text lines. Preserve the source credit in [NOTICE](NOTICE):

```text
Required Notice: Copyright 2026 myflww; Acorn Expedition / 橡果远征; Original source: https://github.com/myflww/acorn-expedition
```

Private players need not post a credit, register or submit proof; keep the included license and source files. See [ATTRIBUTION.md](ATTRIBUTION.md).

This grant covers this repository's Acorn Expedition only, not Luma Companion or materials outside the repository.

Contact: [1805680363@qq.com](mailto:1805680363@qq.com).
