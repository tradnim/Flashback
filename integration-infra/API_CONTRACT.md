# Shared API contract — draft

Chris coordinates changes to this document. Agree on the contract before adding service implementations. All timestamps are ISO 8601 UTC strings; the frontend formats them for display.

## Historical events

`GET /api/events?time=<ISO-8601 timestamp>`

Returns only verified events whose timestamp is less than or equal to `time`.

```json
{
  "currentTime": "1986-04-26T00:00:00Z",
  "events": [
    {
      "id": "stable-event-id",
      "timestamp": "1986-04-26T00:00:00Z",
      "title": "Event title",
      "description": "Verified summary",
      "category": "plant",
      "importance": 5,
      "sources": [{ "label": "Source name", "url": "https://example.org/source" }]
    }
  ]
}
```

`category` is initially one of `plant`, `response`, `public`, or `context`. The event owner should adjust these to match the verified dataset before implementation.

## Ask the historian

`POST /api/ask`

Request:

```json
{ "question": "What is known about the situation?", "historicalTime": "1986-04-26T00:00:00Z" }
```

Response:

```json
{ "answer": "Answer grounded in information available at that time.", "sources": [] }
```

The AI service receives only events at or before `historicalTime`. It must not reveal later outcomes.

## Radio briefing

`POST /api/broadcast`

Request:

```json
{ "historicalTime": "1986-04-26T00:00:00Z" }
```

Response:

```json
{ "script": "A brief, time-appropriate radio update.", "audioUrl": "https://example.org/generated-audio.mp3" }
```

The audio URL may be replaced with a different agreed delivery format. The script must use only events unlocked at `historicalTime`.

## Shared rules

- Reject invalid timestamps with HTTP 400 and a small JSON error body.
- Do not include upcoming event titles, counts, or times in responses; those can spoil the simulation.
- Keep source records attached to event-derived answers.
- Coordinate schema and response changes here before implementing them.
