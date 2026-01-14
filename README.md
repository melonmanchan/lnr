# lnr

Linear CLI

## Installation

### OSX

```
brew tap melonmanchan/lnr
brew install melonmanchan/lnr/lnr
```

### Linux/Windows

Please see the `releases` tab in github and download the binaries there

https://github.com/melonmanchan/lnr/releases


### Getting started

Run `lnr auth login` to start an interactive onboarding to create a personal API token among doing other configuration


### Examples

```sh
# List projects available for your organisation
lnr project list
```

```sh
# Create a new issue, passing some data as a command-line argument and filling interactively
lnr issue create --title "My first Linear issue"
```


```sh
# List issues for project "My first project" that are in-progress and assigned to Mikko
lnr project issue list --assignee mikko.mallikas --status started --project "My first project"
```

```sh
# Move an issue into "started" and assign it to a person
lnr issue edit TT-123 --status started --assignee mikko.mallikas
```

```sh
# Open an issue in the linear web app
lnr issue view TT-123 --web
```

```sh
# List all milestones for a project
lnr project milestone list "Q1 2025 Release"
```

```sh
# Edit a specific milestone date
lnr project milestone edit "Q1 2025 Release" "Design Complete" --date 2025-02-15
```

```sh
# Edit all milestone dates for a project
lnr project milestone edit-many "Q1 2025 Release" --date 2025-03-01
```

```sh
# Edit milestones matching a filter
lnr project milestone edit-many "Q1 2025 Release" --milestone "Sprint" --date 2025-03-01
```
