# Year-in-review CIF
This repository generates a datavisualization of the work completed by the 2026 Summer Cohort of the CodingItFoward Fellows at the CMS Open Source Program Office (OSPO).

## Team Mission
The CMS OSPO is committed to advancing open source practices across the agency by building and maintaining shared programs, policies, and projects that make it easier for CMS teams to develop, deploy, and sustain open, transparent, and accessible software.

## Core Team

A list of core team members responsible for the code and documentation in this repository can be found in [COMMUNITY.md](COMMUNITY.md).

<!--
## Repository Structure

TODO: Including the repository structure helps viewers quickly understand the project layout. Using the "tree -d" command can be a helpful way to generate this information, but, be sure to update it as the project evolves and changes over time.

To install the tree command:
In the command line
- MacOS: 
```
brew install tree
```

- Linux: 
```
sudo apt-get update
sudo apt-get install tree
```

Windows:
```
choco install tree
```

**{list directories and descriptions}**

TODO: Add a 'table of contents" for your documentation. Tier 0/1 projects with simple README.md files without many sections may or may not need this, but it is still extremely helpful to provide "bookmark" or "anchor" links to specific sections of your file to be referenced in tickets, docs, or other communication channels.

**{list of .md at top directory and descriptions}**

-->

<!-- TODO
## Development and Software Delivery Lifecycle
This section provides an overview of how this project typically manages code changes and delivers software updates. It is intended to help contributors understand the general flow of work, not to set mandatory procedures. Programs and teams may adjust these practices to meet their own requirements, governance structures, or release schedules.

Project team members with write access work directly in this repository. External contributors follow the same general workflow but submit changes through a fork and cannot merge their own pull requests. Additional guidance for contributing is available in:
[CONTRIBUTING.md](./CONTRIBUTING.md).

This project aligns with the organization’s common approach to versioning, preparing releases, and communicating updates. Rather than restating those details here, please refer to the OSPO Release Guidelines:

[Release Guidelines (OSPO Guide)](https://dsacms.github.io/ospo-guide/outbound/release-guidelines/)

These guidelines outline agency-wide expectations for semantic versioning, release candidates, GitHub releases, and associated review and communication practices. Individual projects may follow this model in full or tailor it to their operational needs.
-->

## Local Development

<!--- TODO - with example below:
This project is a monorepo with several apps. Please see the [api](./api/README.md) and [frontend](./frontend/README.md) READMEs for information on spinning up those projects locally. Also see the project [documentation](./documentation) for more info.
-->

```bash
npm install
npm start          # http://localhost:8080
npm test           # accessibility regression suite
```

## Pointing this at a different organization

All organization identity lives in [`src/_data/org.json`](./src/_data/org.json).
Nothing else needs editing to retarget the site:

```json
{
  "name": "Your Organization",
  "url": "https://example.org",
  "logo": "https://github.com/your-org.png?size=160",
  "github": { "org": "your-org", "url": "https://github.com/your-org" },
  "drupal": { "enabled": false }
}
```

The name is used in the page title, the hero, the intro sentence and the footer.
`logo` is optional — if it is absent, or the request fails, the image is dropped
and the name alone is shown.

Set `drupal.enabled` to `true` and give either a `nid` or an `orgTitle` to also
report Drupal.org issue credits. `orgTitle` is looked up against the
Drupal.org organization directory, so the node id is optional.

Then regenerate the data:

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt requests

# GitHub: rolling one-year window
GH_TOKEN=$(gh auth token) ORG_NAME=your-org \
  .venv/bin/python scripts/generate_metrics.py 2025-09-03 2026-09-03

# Drupal.org (reads src/_data/org.json; no credentials needed)
.venv/bin/python scripts/drupal_metrics.py
```

`.github/workflows/refresh-metrics.yml` runs both weekly and reads the
organization from the same config file.

### A note on the Drupal.org numbers

Drupal.org's public API refuses to filter issue credits by organization
(`field_attribute_contribution_to` returns `403`), so per-issue detail is not
available. The aggregate counters published on the organization node are used
instead, and the page links to that node as its source.

## Coding Style and Linters

<!-- TODO - Add the repo's linting and code style guidelines -->

Each application has its own linting and testing guidelines. Lint and code tests are run on each commit, so linters and tests should be run locally before committing.

<!--
## Branching Model

TODO - with example below:
This project follows [trunk-based development](https://trunkbaseddevelopment.com/), which means:

* Make small changes in [short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/) and merge to `main` frequently.
* Be open to submitting multiple small pull requests for a single ticket (i.e. reference the same ticket across multiple pull requests).
* Treat each change you merge to `main` as immediately deployable to production. Do not merge changes that depend on subsequent changes you plan to make, even if you plan to make those changes shortly.
* Ticket any unfinished or partially finished work.
* Tests should be written for changes introduced, and adhere to the text percentage threshold determined by the project.

This project uses **continuous deployment** using [Github Actions](https://github.com/features/actions) which is configured in the [./github/workflows](.github/workflows) directory.

Pull-requests are merged to `main` and the changes are immediately deployed to the development environment. Releases are created to push changes to production.
-->

## Contributing

Thank you for considering contributing to an Open Source project of the US Government! For more information about our contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Community Guidelines

Principles and guidelines for participating in our open source community are can be found in [COMMUNITY.md](COMMUNITY.md). Please read them before joining or starting a conversation in this repo or one of the channels listed below. All community members and participants are expected to adhere to the community guidelines and code of conduct when participating in community spaces including: code repositories, communication channels and venues, and events.

<!--
## Governance
Information about how the **{project_name}** community is governed may be found in [GOVERNANCE.md](GOVERNANCE.md).

<!--
## Feedback
If you have ideas for how we can improve or add to our capacity building efforts and methods for welcoming people into our community, please let us know at **opensource@cms.hhs.gov**. If you would like to comment on the tool itself, please let us know by filing an **issue on our GitHub repository.**

## Glossary
Information about terminology and acronyms used in this documentation may be found in [GLOSSARY.md](GLOSSARY.md).
-->

## Policies

### Open Source Policy

We adhere to the [CMS Open Source
Policy](https://github.com/CMSGov/cms-open-source-policy). If you have any
questions, just [shoot us an email](mailto:opensource@cms.hhs.gov).

### Security and Responsible Disclosure Policy

_Submit a vulnerability:_ Vulnerability reports can be submitted through [Bugcrowd](https://bugcrowd.com/cms-vdp). Reports may be submitted anonymously. If you share contact information, we will acknowledge receipt of your report within 3 business days.

For more information about our Security, Vulnerability, and Responsible Disclosure Policies, see [SECURITY.md](SECURITY.md).

### Software Bill of Materials (SBOM)

A Software Bill of Materials (SBOM) is a formal record containing the details and supply chain relationships of various components used in building software.

In the spirit of [Executive Order 14028 - Improving the Nation’s Cyber Security](https://www.gsa.gov/technology/it-contract-vehicles-and-purchasing-programs/information-technology-category/it-security/executive-order-14028), a SBOM for this repository is provided here: https://github.com/DSACMS/year-in-review-cif/network/dependencies.

For more information and resources about SBOMs, visit: https://www.cisa.gov/sbom.

## Public domain

This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/) as indicated in [LICENSE](LICENSE).

All contributions to this project will be released under the CC0 dedication. By submitting a pull request or issue, you are agreeing to comply with this waiver of copyright interest.
