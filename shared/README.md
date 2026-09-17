# shared/

Cross-language contracts. Files here are read by **both** the Python test suite and the Vitest suite. A case added on one side must pass on the other.

- `dda_cases.json` — DDA test vectors (starter set of 7; T031 brings it to ≥ 20). `windowLength` is the expected length of `state.window` after the call. `explanation` is optional and, when present, must match exactly.
- `reminder_id_cases.json` — (created in T023) `{routineItemId, date, expectedUuid}` for the uuid5 reminder id rule.
- `intent_cases.json` — (created in T081) `{lang, utterance, intent, slots}`.
