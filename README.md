# Pick an Assignee (Github Action)

Add your configuration on `.github/pick-an-assignee.yml`:
```yaml
groups: # create groups of users
  - name: devs # name of the group
    usernames: # github usernames of the reviewers
      - a_user
      - another_user
      - some_other_user
      - someone_else

  - name: other_group # you can have multiple groups, as long as the names are unique
    usernames:
      - some_user # users can be in multiple groups
      - someone_else
domains: # create domains
  - paths:
      - "/some-path"
      - ""/some-other-path/*/with-regex"
    weights: # optional, weight importance
      additions: 1 # optional
      deletions: 1 # optional
      changes: 1 # optional
      files: 10 # optional
    required: false # optionally, require path matches to assign group
    groups: # assign group(s) to domain
      devs
count: 1 # optional, add amount of assignees
weights: # optional, weights can be assigned globally
  additions: 1 # optional
  deletions: 1 # optional
  changes: 1 # optional
  files: 10 # optional
```

Ideal workflow configuration is:
```yaml
name: "Pick an Assignee"
on:
  pull_request_target:
    types: [opened, ready_for_review, reopened]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: cameronaziz/pick-an-assignee@v1
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## FAQ
**Why on pull_request_target?**

By running this action on `pull_request_target` we enable this action to be performed on PRs opened by users with 
readonly access to the repo, for example those by Dependabot.
