# Shared API contract

This document describes the public API used by the frontend and backend services. All timestamps are ISO 8601 strings in UTC, with a `Z` suffix.

`simulationTime` and `historicalTime` refer to the same value: the time shown by the simulation clock. The events endpoint uses `simulationTime` in its query string. The AI endpoints use `historicalTime` in their JSON request bodies. The AI service also accepts `simulationTime` in those bodies; if both names are supplied, they must represent the same instant.

## Historical events

`GET /api/events?simulationTime=<ISO-8601 timestamp>`

The caller must provide `simulationTime`. Return only verified events whose timestamp is less than or equal to it. Do not substitute the computer's current time if the parameter is missing or invalid; return HTTP 400 instead.

Successful response:

```json
{
  "status": "success",
  "authoritativeClock": "1986-04-26T00:00:00Z",
  "count": 1,
  "data": [
    {
      "eventId": "CHER-1986-0426-01",
      "timestamp": "1986-04-26T00:00:00Z",
      "title": "Event title",
      "description": "Verified summary",
      "category": "ACCIDENT",
      "importance": "Critical",
      "isVerified": true,
      "citations": [
        {
          "sourceName": "Source name",
          "referenceId": "Report or archive reference",
          "url": "https://example.org/source"
        }
      ]
    }
  ]
}
```

- `authoritativeClock` is the timestamp used to filter the results.
- `count` is the number of records in `data` and must not include future events.
- `eventId` is the stable identifier for an event.
- The current dataset uses `OPERATIONAL`, `SAFETY`, `ACCIDENT`, `EMERGENCY_RESPONSE`, and `RADIOLOGICAL` categories.
- `importance` is an optional string currently using `Low`, `Medium`, `High`, or `Critical`.
- Each citation has `sourceName` and `referenceId`; `url` is optional.

The route currently returns MongoDB documents, which may include storage metadata such as `_id`, `createdAt`, `updatedAt`, and `__v`. Clients should use the public fields listed above and must not depend on database metadata.

Invalid or missing timestamps return HTTP 400, for example:

```json
{
  "error": "INVALID_SIMULATION_TIME",
  "message": "A valid simulationTime is required."
}
```

## Ask the historian

`POST /api/ask`

Request:

```json
{
  "question": "What is known about the situation?",
  "historicalTime": "1986-04-26T00:00:00Z"
}
```

The AI service receives only verified, cited events at or before `historicalTime`. It must not reveal later outcomes.

Successful response:

```json
{
  "answer": "Answer grounded in information available at that time.",
  "sources": [
    {
      "label": "Source name",
      "url": "https://example.org/source",
      "eventId": "CHER-1986-0426-01",
      "eventTitle": "Event title"
    }
  ]
}
```

`sources` may be empty when the unlocked records do not support an answer. `url`, `eventId`, and `eventTitle` may be omitted when unavailable.

## Radio briefing

`POST /api/broadcast`

Request:

```json
{
  "historicalTime": "1986-04-26T00:00:00Z"
}
```

Successful response:

```json
{
  "script": "A brief, time-appropriate radio update.",
  "audioUrl": "data:audio/mpeg;base64,<base64-encoded-mp3>"
}
```

`audioUrl` is a playable MP3 data URL embedded in the JSON response, not a separately hosted file. The script and audio must use only events unlocked at `historicalTime`.

## Shared rules

- Reject missing or invalid timestamps with HTTP 400. Timestamps must include a timezone and be interpreted in UTC.
- Never return future event records or information that reveals future event titles, counts, or times.
- Keep source records attached to event-derived answers.
- Coordinate changes to these request and response shapes with all service owners before changing the implementation.
