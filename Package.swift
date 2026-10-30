// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ConsistentKing",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "ConsistentKingCore", targets: ["ConsistentKingCore"]),
        .executable(name: "consistent-king", targets: ["ConsistentKingCLI"])
    ],
    targets: [
        .target(name: "ConsistentKingCore"),
        .executableTarget(name: "ConsistentKingCLI", dependencies: ["ConsistentKingCore"]),
        .testTarget(name: "ConsistentKingCoreTests", dependencies: ["ConsistentKingCore"])
    ]
)
