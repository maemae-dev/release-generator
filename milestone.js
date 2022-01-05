const github = require("@actions/github");
const core = require("@actions/core");

const issueSentence = (issue) => {
  return `- **${issue.title}** #${issue.number} by ${issue.user.login}\n`
}
const createDescription = (labels) => {  
  const labelSections = labels.reduce((body, label) => {
    const title = `## ${label.name}: ${label.description}\n`;
    const issuesForLabel = issues
      .filter(
        (issue) =>
          issue.labels.filter((issueLabel) => label.name === issueLabel.name)
            .length > 0
      )
      .map((issue) => issueSentence(issue));
    const section = title.concat(...issuesForLabel);
    return body.concat(section);
  }, "")

  const labelEmptyIssues = issues
    .filter((issue) => issue.labels.length === 0)
    .map((issue) => issueSentence(issue));

  const title = "## label is empty\n";
  const emptySection = title.concat(...labelEmptyIssues);
  return labelSections + emptySection;
}

const createRelease = async (version, branch, body) => {
  const version_without_v = version.slice(1, version.length)
  return octokit.rest.repos.createRelease({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tag_name: version,
    name: `Release ${version_without_v}`,
    target_commitish: `${branch}`,
    draft: true,
    body: body,
  });
}

let test = async (version) => {
  if (typeof version !== "string") {
    throw new Error("version not a string");
  }
  const token = core.getInput("token");
  if (typeof token !== "string") {
    throw new Error("token is not valid");
  }
  const octokit = github.getOctokit(token);

  const branch = core.getInput("branch");
  if (typeof branch !== "string") {
    throw new Error("branch not a string");
  }

  for await (const response of octokit.paginate.iterator(
    octokit.rest.issues.listMilestones,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    }
  )) {
    const milestones = response.data.filter((m) => m.title === version);
    if (milestones.length === 0) {
      throw new Error("no results for milestones");
    }
    const milestone = milestones[0];

    core.info(`Start create release for milestone ${milestone.title}`);

    for await (const response of octokit.paginate.iterator(
      octokit.rest.issues.listForRepo,
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        milestone: milestone.number,
        state: "closed",
        per_page: 100
      }
    )) {
      const issues = response.data;
      if (issues.length === 0) {
        throw new Error("no results for issues");
      }

      const labels = issues
        .map((issue) => issue.labels)
        .flatMap((issue) => issue)
        .reduce(
          (labels, l) =>
            labels.filter((v) => v.name === l.name).length > 0
              ? labels
              : labels.concat(l),
          []
        );

      const description = createDescription(labels);
      await createRelease(version, branch, description);
    }
  }
};

module.exports = test;
