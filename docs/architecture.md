# Architecture direction

## Goals

Prioritize iOS, support a browser client, and leave Android possible without rebuilding domain logic. Share non-UI Swift code wherever platform support permits.

## Boundaries

`ConsistentKingCore` contains platform-independent models and use cases. Client interfaces call that core and supply platform services through protocols as needed. Keep persistence, keychain access, notifications, HTTP transports, and UI code outside the portable domain layer. Add packages only after checking their target-platform support.

The root Swift package is a foundation, not a runnable iOS application. Add the SwiftUI app and its Xcode project in `apps/ios` when the first user flow is defined. It should depend on the root package locally.

For the browser, first prove a small core function can be built with the official Swift WebAssembly SDK and called from JavaScript. WebAssembly compilation alone does not provide DOM bindings, a JavaScript API, or a web UI. Select and test an interop tool before implementing `apps/web`. Keep browser-only behavior at that boundary.

For Android, evaluate the official Swift SDK and swift-java interoperability for sharing the core with Kotlin/Jetpack Compose. Skip Fuse is another option to evaluate if sharing presentation later becomes valuable; it is not a dependency of this starter.

## Validation

Host builds validate the starter only. Add separate WebAssembly and Android cross-compilation checks as integrations are introduced. Use macOS/Xcode for iOS simulator builds and signing. Cloud tasks can edit all sources, but their actual tools determine which targets they can verify.

## Primary references

- https://www.swift.org/documentation/articles/wasm-getting-started.html
- https://www.swift.org/documentation/articles/swift-sdk-for-android-getting-started.html
- https://skip.dev/docs/modes/

## First milestones

1. Define the product's first user flow and data sources.
2. Implement the first domain use case with focused Swift tests.
3. Add the SwiftUI client and simulator build check.
4. Prove Swift-to-browser interop, then add the web client.
5. Add Android after the primary clients stabilize.
