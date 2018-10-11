# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist/lifecycle-automation/compare/0.10.24...HEAD)

### Changed

-   Sort goals with information from the planned goalSet. [2bbff42](https://github.com/atomist/lifecycle-automation/commit/2bbff4286a83cecb356bdad843561d3e01f0b141)

## [0.10.24](https://github.com/atomist/lifecycle-automation/compare/0.10.23...0.10.24) - 2018-10-06

## [0.10.23](https://github.com/atomist/lifecycle-automation/compare/0.10.22...0.10.23) - 2018-10-05

## [0.10.22](https://github.com/atomist/lifecycle-automation/compare/0.10.21...0.10.22) - 2018-10-05

## [0.10.21](https://github.com/atomist/lifecycle-automation/compare/0.10.20...0.10.21) - 2018-10-04

### Changed

-   Show "Raise PR if successful" button when pushing to a branch. [#244](https://github.com/atomist/lifecycle-automation/issues/244)

### Fixed

-   Configure lifecycle doesn't persist in atomist-community. [#241](https://github.com/atomist/lifecycle-automation/issues/241)

## [0.10.20](https://github.com/atomist/lifecycle-automation/compare/0.10.19...0.10.20) - 2018-10-03

### Changed

-   Update to more standard Node.js package layout. [#251](https://github.com/atomist/lifecycle-automation/issues/251)

### Fixed

-   Selecting repo from drop-down list when creating a channel doesn't link that repo. [#247](https://github.com/atomist/lifecycle-automation/issues/247)
-   Always provide channel name when linking repo and channel.

## [0.10.19](https://github.com/atomist/lifecycle-automation/compare/0.10.18...0.10.19) - 2018-10-02

### Added

-   Adding missing channelName variable to LinkSlackChannelToRepo mutation. [#249](https://github.com/atomist/lifecycle-automation/issues/249)

### Changed

-   Ensuring that ChannelName is passed through to the link repo mutation. [#248](https://github.com/atomist/lifecycle-automation/issues/248)

## [0.10.18](https://github.com/atomist/lifecycle-automation/compare/0.10.17...0.10.18) - 2018-09-24

## [0.10.17](https://github.com/atomist/lifecycle-automation/compare/0.10.16...0.10.17) - 2018-09-24

### Added

-   Handle pre approval of goals. [0acb9d5](https://github.com/atomist/lifecycle-automation/commit/0acb9d58c7d677156f4942dae383779f644d9653)

## [0.10.16](https://github.com/atomist/lifecycle-automation/compare/0.10.15...0.10.16) - 2018-09-21

### Removed

-   Remove event log. [#246](https://github.com/atomist/lifecycle-automation/issues/246)

## [0.10.15](https://github.com/atomist/lifecycle-automation/compare/0.10.14...0.10.15) - 2018-09-20

## [0.10.14](https://github.com/atomist/lifecycle-automation/compare/0.10.13...0.10.14) - 2018-09-20

## [0.10.13](https://github.com/atomist/lifecycle-automation/compare/0.10.12...0.10.13) - 2018-09-20

## [0.10.12](https://github.com/atomist/lifecycle-automation/compare/0.10.11...0.10.12) - 2018-09-20

## [0.10.11](https://github.com/atomist/lifecycle-automation/compare/0.10.10...0.10.11) - 2018-09-19

## [0.10.10](https://github.com/atomist/lifecycle-automation/compare/0.10.9...0.10.10) - 2018-09-19

### Fixed

-   Better goal sorting within envs. [#cdffb54](https://github.com/atomist/lifecycle-automation/commit/cdffb54676ef1c82ece44833b06c74a49917b25e)

## [0.10.9](https://github.com/atomist/lifecycle-automation/compare/0.10.8...0.10.9) - 2018-09-18

### Fixed

-   Catch cyclic goal sorting issues and render unsorted. [#34dea29](https://github.com/atomist/lifecycle-automation/commit/34dea29815b29b00200f425bb4a9e82f75c26619)

## [0.10.8](https://github.com/atomist/lifecycle-automation/compare/0.10.7...0.10.8) - 2018-09-17

## [0.10.7](https://github.com/atomist/lifecycle-automation/compare/0.10.6...0.10.7) - 2018-09-17

### Added

-   Permit the linking of MS Teams channels to repo with the LinkRepo command. [#245](https://github.com/atomist/lifecycle-automation/issues/245)

## [0.10.6](https://github.com/atomist/lifecycle-automation/compare/0.10.5...0.10.6) - 2018-09-05

### Fixed

-   Requiring github auth for "@atomist link repos" when it's a bitbucket only team. [#243](https://github.com/atomist/lifecycle-automation/issues/243)

## [0.10.5](https://github.com/atomist/lifecycle-automation/compare/0.10.4...0.10.5) - 2018-08-27

## [0.10.4](https://github.com/atomist/lifecycle-automation/compare/0.10.3...0.10.4) - 2018-08-24

### Changed

-   Disable GitHub release button by default. [#6c5617b](https://github.com/atomist/lifecycle-automation/commit/6c5617b897751108c06c4bf823db97376015c86a)

## [0.10.3](https://github.com/atomist/lifecycle-automation/compare/0.10.2...0.10.3) - 2018-08-24

## [0.10.2](https://github.com/atomist/lifecycle-automation/compare/0.10.1...0.10.2) - 2018-08-24

## [0.10.1](https://github.com/atomist/lifecycle-automation/compare/0.10.0...0.10.1) - 2018-08-24

## [0.10.0](https://github.com/atomist/lifecycle-automation/compare/0.9.5...0.10.0) - 2018-08-22

### Added

-   Allow other merge strategies for the Auto merge functionality. [#144](https://github.com/atomist/lifecycle-automation/issues/144)

### Fixed

-   Raise PR doesn't show for sdm only builds. [#240](https://github.com/atomist/lifecycle-automation/issues/240)
-   Notify committer not author on failed build. [#62](https://github.com/atomist/lifecycle-automation/issues/62)

## [0.9.5](https://github.com/atomist/lifecycle-automation/compare/0.9.4...0.9.5) - 2018-08-02

## [0.9.4](https://github.com/atomist/lifecycle-automation/compare/0.9.3...0.9.4) - 2018-07-31

### Added

-   Gitlab avatar rendering needs to use scmId.avatar. [#238](https://github.com/atomist/lifecycle-automation/issues/238)

## [0.9.3](https://github.com/atomist/lifecycle-automation/compare/0.9.2...0.9.3) - 2018-07-27

## [0.9.2](https://github.com/atomist/lifecycle-automation/compare/0.9.1...0.9.2) - 2018-07-27

## [0.9.1](https://github.com/atomist/lifecycle-automation/compare/0.9.0...0.9.1) - 2018-07-27

## [0.9.0](https://github.com/atomist/lifecycle-automation/compare/0.8.44...0.9.0) - 2018-07-25

## [0.8.44](https://github.com/atomist/lifecycle-automation/compare/0.8.43...0.8.44) - 2018-07-25

## [0.8.43](https://github.com/atomist/lifecycle-automation/compare/0.8.42...0.8.43) - 2018-07-15

### Added

-   Raise PR button shows when goal set is still running. [#237](https://github.com/atomist/lifecycle-automation/issues/237)

## [0.8.42](https://github.com/atomist/lifecycle-automation/compare/0.8.41...0.8.42) - 2018-07-13

## [0.8.41](https://github.com/atomist/lifecycle-automation/compare/0.8.40...0.8.41) - 2018-07-13

## [0.8.40](https://github.com/atomist/lifecycle-automation/compare/0.8.39...0.8.40) - 2018-07-12

### Added

-   Bitbucket support for links in Push message. [#194](https://github.com/atomist/lifecycle-automation/issues/194)

## [0.8.39](https://github.com/atomist/lifecycle-automation/compare/0.8.38...0.8.39) - 2018-07-10

### Added

-   Some lifecycle event handlers are missing for PR on cards. [#236](https://github.com/atomist/lifecycle-automation/issues/236)

## [0.8.38](https://github.com/atomist/lifecycle-automation/compare/0.8.37...0.8.38) - 2018-07-10

## [0.8.37](https://github.com/atomist/lifecycle-automation/compare/0.8.36...0.8.37) - 2018-07-10

## [0.8.36](https://github.com/atomist/lifecycle-automation/compare/0.8.35...0.8.36) - 2018-07-10

## [0.8.35](https://github.com/atomist/lifecycle-automation/compare/0.8.34...0.8.35) - 2018-07-08

## [0.8.34](https://github.com/atomist/lifecycle-automation/compare/0.8.33...0.8.34) - 2018-07-06

### Fixed

-   Goal approval missing in push rendering. [#234](https://github.com/atomist/lifecycle-automation/issues/234)

## [0.8.33](https://github.com/atomist/lifecycle-automation/compare/0.8.32...0.8.33) - 2018-07-04

### Added

-   Fallback to email address on commit if there is no author. [#231](https://github.com/atomist/lifecycle-automation/issues/231)

### Fixed

-   Restart button missing on retry-able goals. [#233](https://github.com/atomist/lifecycle-automation/issues/233)

## [0.8.32](https://github.com/atomist/lifecycle-automation/compare/0.8.31...0.8.32) - 2018-06-30

### Added

-   Hide SDM status from dashboard cards. [#230](https://github.com/atomist/lifecycle-automation/issues/230)

### Fixed

-   Update logzio extension to latest version. [#229](https://github.com/atomist/lifecycle-automation/issues/229)

## [0.8.31](https://github.com/atomist/lifecycle-automation/compare/0.2.6...0.8.31) - 2018-06-28

### Fixed

-   Make sure branch is available on PullRequestToBranchLifecycle.
-   Ensure msgId is set before trying to extract the screen name.
-   Do not match partial image URLs. [#104](https://github.com/atomist/lifecycle-automation/issues/104)
-   Provide path to GitHubApi for GHE instances. [#121](https://github.com/atomist/lifecycle-automation/issues/121)
-   Account for channels without names. [#123](https://github.com/atomist/lifecycle-automation/issues/123)
-   Fetch repositories from GitHub. [#59](https://github.com/atomist/lifecycle-automation/issues/59)
-   Catastrophic backtracking in image URL regular expression. [#136](https://github.com/atomist/lifecycle-automation/issues/136)

## [0.2.6](https://github.com/atomist/lifecycle-automation/compare/0.2.5...0.2.6) - 2017-11-15

### Added

-   Metrics tracking via Datadog now.

### Changed

-   Auto-Merge now uses a repo rather a comment.

## [0.2.5](https://github.com/atomist/lifecycle-automation/compare/0.2.4...0.2.5) - 2017-11-15

### Added

-   Request Review is now a drop-down if there are suggested reviewers on GitHub.

### Fixed

-   Auto-Merge button now correctly disappears again once auto-merge is enabled.

## [0.2.4](https://github.com/atomist/lifecycle-automation/compare/0.2.3...0.2.4) - 2017-11-13

### Changed

-   Properly cache graph client instances.

## [0.2.3](https://github.com/atomist/lifecycle-automation/compare/0.2.2...0.2.3) - 2017-11-13

### Changed

-   Updated to new automation-client to use Cluster infrastructure.

## [0.2.2](https://github.com/atomist/lifecycle-automation/compare/0.2.1...0.2.2) - 2017-11-12

### Changed

-   Deploy to internal Kube clusters.

## [0.2.1](https://github.com/atomist/lifecycle-automation/compare/0.2.0...0.2.1) - 2017-11-11

### Removed

-   Due to endless loop removed circle workflow rendering.

## [0.2.0](https://github.com/atomist/lifecycle-automation/compare/0.1.38...0.2.0) - 2017-11-10

### Added

-   Ability to configure lifecycles via `@atomist configure lifecycle` per channel.

### Fixed

-   `NotifyBotOwnerOnPush` was not sending `HandlerResult`.

## [0.1.38](https://github.com/atomist/lifecycle-automation/compare/0.1.37...0.1.38) - 2017-11-09

### Added

-   Tag button on tags.

### Changed

-   Only 3 referenced issues and pull request will now be displayed.

## [0.1.37](https://github.com/atomist/lifecycle-automation/compare/0.1.36...0.1.37) - 2017-11-09

### Added

-   Link repository to channel command and event handlers.
-   Send message when bot joins a channel.

### Changed

-   Updated package scripts to have standard names and be platform.

### Fixed

-   Provide warning when someone tries to link a repo to a non-public.

## [0.1.0](https://github.com/atomist/lifecycle-automation/tree/0.1.0) - 2017-10-11

### Added

-   Lifecycle rendering for Github Issues, PullRequest, Pushes as well.
