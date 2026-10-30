# Codex cloud setup

No dedicated Checkmate cloud environment has been configured or published yet.

## Setup

1. Use the public GitHub repository [cvillanueva10/checkmate](https://github.com/cvillanueva10/checkmate).
2. In ChatGPT/Codex, choose **Work in > Cloud > Select environment > Create environment** and select the new repository.
3. Install an official Swift toolchain, version 6.0 or newer, and put `swift` on PATH. The CI workflow uses Swift 6.3.1 to match waiver-warrior.
4. Run `swift --version`, `swift build`, and `swift run checkmate` from the repository root.
5. Review setup results and publish the environment.
6. Start a fresh task and repeat the build check to verify restoration.

The initial scaffold was created in an environment without Swift installed; its build and CLI have not been verified locally.

iOS simulator/device validation requires macOS and Xcode. No signing credentials are needed for the shared core.

Official documentation: https://learn.chatgpt.com/docs/cloud
