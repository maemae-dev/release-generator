const github = require("@actions/github");
const core = require("@actions/core");

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
    octokit.rest.issues.listForRepo,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      milestone: version,
    }
  )) {
    const issues = response.data;
    if (issues.length === 0) {
      throw new Error("no results for issues");
    }

    const labels = issues
      .map((i) => i.labels)
      .flatMap()
      .reduce(
        (labels, l) => (labels.indexOf(l) > 0 ? labels : labels.concat(l)),
        []
      );

    const description = labels.reduce((body, l) => {
      const title = `## ${l.name} ${l.description}\n`;
      const issuesForLabel = issues
        .filter((i) => i.labels.includes(l))
        .map((i) => `- ${i.title} #${i.number} by ${i.user.name}\n`);
      const section = title.concat(...issuesForLabel);
      return body.concat(section);
    }, "");

    const version_without_v = version.slice(1, version.length);

    await octokit.rest.repos.createRelease({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      tag_name: version,
      name: `Release ${version_without_v}`,
      target_commitish: branch,
      draft: true,
      body: description,
    });
  }
};

module.exports = test;
