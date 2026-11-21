# Reference admission

The root legacy JSON datasets and `raw/` text files are quarantined historical inputs, not authentic institutional captures. See `legacy_quarantine.json` for hashes and scenario dispositions. Matching a local checksum or preserving an INDEPENDENT_VALIDATED string is not independent validation.

Only `acquired/` has a reproducible original-response/publication chain checked by `python3 scripts/core-reference-acquire.py verify`. It contains limited genuine upstream-published Skyfield/ERFA/IANA evidence and separately identified Swiss vendor mode-test data. Direct institutional retrieval remains pending; `accept` deliberately exits nonzero. Routine tests using old numbers are labeled legacy regressions, never astronomical acceptance.

All32 scenarios remain available. Pure angular/calendar tests are distinguished from dated observational evidence. The exact180degree legacy Tithi expectation is incompatible with the selected half-open convention; the old value is preserved and flagged rather than silently adjusted to make acceptance pass. Vancouver calendar regression uses the baseline's actual2024 input despite stale2026 description text. More dated references are needed before global precision claims or CORE-P0-02 admission.
