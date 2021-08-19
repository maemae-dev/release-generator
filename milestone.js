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

  const repo = await octokit.rest.repos.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });
  core.info(`${repo.data.name}`);

  for await (const response of octokit.paginate.iterator(
    octokit.rest.issues.listForRepo,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      milestone: 1,
    }
  )) {
    const issues = response.data;
    console.log(issues.length);
  }

  // for await (const response of octokit.paginate.iterator(
  //   octokit.rest.issues.listMilestones,
  //   { owner: github.context.repo.owner, repo: github.context.repo.repo }
  // )) {
  //   const milestones = response.data;
  //   const filtered = milestones.filter((m) => m.title === version);
  //   if (filtered.length === 0) return;
  //   const milestone = filtered[0];
  //   core.info(milestone.number);
  // 	milestone.c

  // }
};

module.exports = test;
