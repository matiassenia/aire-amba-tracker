# ADR-002 Environmental Variables

## Status

Accepted

## Decision

Environmental variables are first-class domain entities and are accessed through `EnvironmentalVariableRepository`.

## Rationale

The platform must support more than AQI without coupling ingestion, measurements, or snapshots to a single variable.

## Consequences

Sprint 3 seeds variables for air quality, weather, noise, water quality, fire, and smoke. No new external APIs or ingestion flows are added.
