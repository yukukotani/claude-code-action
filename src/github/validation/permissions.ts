import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";
import type { Octokit } from "@octokit/rest";

/**
 * Check if a GitHub App (bot user) has write permissions to the repository
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 */
async function checkBotWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<void> {
  const { repository } = context;

  try {
    // Get the installation for this repository
    const installationResponse = await octokit.rest.apps.getRepoInstallation({
      owner: repository.owner,
      repo: repository.repo,
    });

    const installationId = installationResponse.data.id;

    // Get the installation permissions
    const permissionsResponse = await octokit.rest.apps.getInstallation({
      installation_id: installationId,
    });

    const permissions = permissionsResponse.data.permissions;

    // Check for required write permissions
    const requiredPermissions = [
      "contents", // Required for creating/modifying files
      "pull_requests", // Required for PR operations
    ] as const;

    const missingPermissions: string[] = [];

    for (const permission of requiredPermissions) {
      const permissionLevel = permissions?.[permission];
      if (permissionLevel !== "write") {
        missingPermissions.push(`${permission}:write`);
      }
    }

    if (missingPermissions.length > 0) {
      throw new Error(
        `GitHub App lacks required write permissions: ${missingPermissions.join(", ")}. ` +
          `Current permissions: ${JSON.stringify(permissions)}`,
      );
    }

    core.info("GitHub App has sufficient write permissions");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not Found")) {
      throw new Error(
        `No GitHub App installation found for repository ${repository.owner}/${repository.repo}. ` +
          "The bot user may not be installed on this repository.",
      );
    }
    throw error;
  }
}

/**
 * Check if the actor has write permissions to the repository
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<boolean> {
  const { repository, actor } = context;

  try {
    core.info(`Checking permissions for actor: ${actor}`);

    // Check if the actor is a GitHub App (bot user)
    if (actor.endsWith("[bot]")) {
      core.info(`Actor is a GitHub App: ${actor}`);
      await checkBotWritePermissions(octokit, context);
      return true;
    }

    // Check permissions directly using the permission endpoint for regular users
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: actor,
    });

    const permissionLevel = response.data.permission;
    core.info(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      core.info(`Actor has write access: ${permissionLevel}`);
      return true;
    } else {
      core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    core.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}
