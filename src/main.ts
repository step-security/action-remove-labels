import * as github from '@actions/github';
import * as core from '@actions/core';
import axios, { isAxiosError } from 'axios';

async function validateSubscription(): Promise<void> {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

  try {
    await axios.get(API_URL, { timeout: 3000 });
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        'Subscription is not valid. Reach out to support@stepsecurity.io'
      );
      process.exit(1);
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.');
    }
  }
}

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github_token');

    const labels = core
      .getInput('labels')
      .split('\n')
      .filter(l => l !== '');
    const [owner, repo] = core.getInput('repo').split('/');
    const number =
      core.getInput('number') === ''
        ? github.context.issue.number
        : parseInt(core.getInput('number'));

    if (labels.length === 0) {
      return;
    }

    const client = github.getOctokit(githubToken);

    const remaining = [];
    for (const label of labels) {
      try {
        await client.rest.issues.removeLabel({
          name: label,
          owner,
          repo,
          issue_number: number
        });
      } catch (e) {
        core.warning(`failed to remove label: ${label}: ${e}`);
        remaining.push(label);
      }
    }

    if (remaining.length) {
      throw new Error(`failed to remove labels: ${remaining}`);
    }
  } catch (e) {
    if (e instanceof Error) {
      core.error(e);
      if (core.getInput('fail_on_error') === 'true') {
        core.setFailed(e.message);
      }
    } else {
      const errorMessage = String(e);
      core.error(errorMessage);
      if (core.getInput('fail_on_error') === 'true') {
        core.setFailed(errorMessage);
      }
    }
  }
}

run();
