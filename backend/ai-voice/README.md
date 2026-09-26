# Noriel — AI + Voice

Own this folder. Implement Gemini answers grounded only in the historical context available at the requested simulated time, plus an ElevenLabs spoken briefing based on that same unlocked context.

## Start here

1. Agree endpoint names and request/response shapes with Chris in `../../integration-infra/API_CONTRACT.md`.
2. Retrieve allowed context through the historical engine; do not query or pass future events to Gemini.
3. Instruct Gemini to say when the outcome is not yet known, and return citations with factual answers.
4. Generate the radio script from unlocked events only, then return audio in the agreed response format.
5. Read API keys from environment variables; never commit credentials.
