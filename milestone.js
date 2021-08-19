const github = require('@actions/github');
const core = require('@actions/core');

let test = async (version) => {
	if (typeof version !== 'string') {
		throw new Error('version not a string');
	}
	const token = core.getInput('token');
	if (typeof token !== 'string') {
		throw new Error('token is not valid');
	}

  const octokit =	github.getOctokit(token);

	const repo = await octokit.rest.repos.get({owner: github.context.repo.owner, repo: github.context.repo.repo});
	core.info(repo);

};

module.exports = test;
