// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Checkmate",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "CheckmateCore", targets: ["CheckmateCore"]),
        .executable(name: "checkmate", targets: ["CheckmateCLI"])
    ],
    targets: [
        .target(name: "CheckmateCore"),
        .executableTarget(name: "CheckmateCLI", dependencies: ["CheckmateCore"]),
        .testTarget(name: "CheckmateCoreTests", dependencies: ["CheckmateCore"])
    ]
)
