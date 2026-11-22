# Dawn Relay: Switchyard | Development workflow

## IntelliJ IDEA

I used IntelliJ IDEA 2026.3 with its free core features to implement and save the **Circuit recap**. The feature reads the completed stages and displays the number of pulses used against the exact minimum, or par, for Glasshouses, Tideworks and Sky Archive. After a timeout it distinguishes the unfinished circuit from any circuit the player did not reach. The recap appears after a run and clears when a new run begins. The implementation lives in `renderCircuitRecap` in `game.mjs`, with its styles in `styles.css`.

## Codex-assisted development and testing

Codex assisted with implementation, test design and recording a guided browser playthrough. Five automated tests passed, covering 48 deterministic board layouts across the three districts, the relay sequence, expiry and practice hints. Desktop and simulated touch checks verified the recap for completed and partial runs. The recorded two-player-mode run scored **740 points in 12 pulses**, with all three circuits cleared at par.

