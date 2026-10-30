# Consistent King

Track daily tasks, build streaks, and set streak or consistency percentage goals. iOS first, with shared Swift business logic and planned web and Android clients.

## Starter status

The portable Swift core supports named daily habits, check-ins and undo, streak goals, and consistency percentage goals over inclusive date ranges. An installable iOS app, persistence, browser UI, WebAssembly bindings, and Android bindings have not been implemented yet.

Consistency is completed days divided by elapsed tracking days, including today, capped at the end date. A percentage goal reports whether the current percentage meets the target; it can change until the period ends. Streak goals are reached when the longest streak meets the target. An unfinished today preserves yesterday's current streak. Each habit uses an explicit calendar for day boundaries; duplicate check-ins count once and future check-ins are rejected.

```sh
swift build
swift test
swift run consistent-king
```

Requires Swift 6.0 or newer. No third-party package dependencies.

## Direction

- **Shared:** `ConsistentKingCore` for models, rules, validation, and use cases.
- **iOS first:** native SwiftUI app consuming the local Swift package.
- **Web:** browser-native UI with the shared core compiled to WebAssembly; validate JavaScript interop before committing to a web framework.
- **Android later:** native UI consuming Swift through the official Android SDK and an interop layer.

Swift is the shared language. There is no single turnkey framework in this starter that supplies all three platform integrations.

See [architecture](docs/architecture.md), [cloud setup](docs/cloud-setup.md), and [agent instructions](AGENTS.md).
