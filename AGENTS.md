# Consistent King

Build an iOS-first application with a web browser client and eventual Android support.

- Put reusable models, business rules, validation, and use cases in `Sources/ConsistentKingCore`.
- Keep the core independent of SwiftUI, UIKit, Android APIs, the DOM, and platform storage/network implementations.
- Use native SwiftUI for iOS. Keep browser presentation separate; reuse the Swift core through WebAssembly after proving the bridge.
- Android is lower priority. Evaluate the official Swift Android SDK and swift-java bridging when work begins.
- Inject platform services through small protocols at the boundary. Avoid duplicating domain rules in client code.
- Swift 6.0 is the package minimum. Cross-compilation requires matching host toolchain and SDK versions; consult official Swift documentation.
- Run `swift build` and `swift run consistent-king`. Add focused tests with real business behavior as features arrive.
- Apple app builds and signing require Xcode on macOS. A Linux core build does not validate the iOS app or WebAssembly/Android integrations.
- Never commit credentials or personal user data. The product tracks daily tasks with streak and consistency percentage goals. Data providers are not yet specified.
- Run `swift test` for core behavior. Keep daily calendar boundaries and goal progress rules explicit.

See `docs/architecture.md` and `docs/cloud-setup.md`.
