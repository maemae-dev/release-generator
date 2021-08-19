# Setup

Add a yml file like the following under the `.github/workflows` directory

```
name: generate_release
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Version name"
        default: "v1.0.0"
        required: true

jobs:
  generate:
    timeout-minutes: 1
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: maemae-dev/release-generator@main
        with:
          version: ${{ github.event.inputs.version }}
          branch: ${{ github.head_ref }}
          token: ${{ secrets.GITHUB_TOKEN }}

```

# Usage

1. Create a milestone named `v1.0.0`
2. Assign them milestone to pull requests
3. From Actions Tab, press the `Run workflow` button.
4. Select target branch and enter milestone name (e.g. `v1.0.0`)
5. From Code Tab, you can see Draft release
