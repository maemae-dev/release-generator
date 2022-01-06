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

/**
 * 
 * @param {octokit} octokit
 * @param {string} version 
 * @param {
 *   owner: string,
 *   repo: string
 * }  
 * @returns milestone: object
 */
const fetchTargetMilestone = async (octokit, {owner, repo}) => {
  const responses =  await octokit.paginate.iterator(
    octokit.rest.issues.listMilestones,
    {
      owner: owner,
      repo: repo,
    }
  );

  const milestone = responses.reduce((milestone, response) => {
    if(milestone) return milestone;
    const milestones = response.data.filter((m) => m.title === version);

    const milestone = milestones[0];
    return milestone;
  }, null);

  if(!milestone) {
    throw new Error("milestone is not found");
  }
  return milestone;
}

/**
 * 
 * @param {octokit} octokit
 * @param {
 *   owner: string,
 *   repo: string
 *   mileStoneNumber: string,
 * }
 * @returns issues: object[]
 */
const fetchIssues = async (
    octokit, {
      owner, 
      repo, 
      mileStoneNumber
    }
  ) => {
  const responses = await octokit.paginate.iterator(
    octokit.rest.issues.listForRepo,
    {
      owner: owner,
      repo: repo,
      milestone: mileStoneNumber,
      state: "closed",
      per_page: 100
    }
  )
  core.info(`response length = ${responses.length}`);
  return responses.map((res) => res.data).flat();
}

const generateReleaseNote = async (version) => {
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

  const milestone = fetchTargetMilestone(
      octokit, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    })

  core.info(`Start create release for milestone ${milestone.title}`);

  const issues = fetchIssues(
    octokit, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      mileStoneNumber: milestone.number,
    }
  )

  core.info(`target length = ${issues.length}`);

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

    core.info(`labels length = ${labels.length}`);
    const description = createDescription(labels);
    core.info(description);
  // await createRelease(version, branch, description);
};

module.exports = generateReleaseNote;
