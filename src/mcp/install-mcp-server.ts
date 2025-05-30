import * as core from "@actions/core";

export async function prepareMcpConfig(
  githubToken: string,
  owner: string,
  repo: string,
  branch: string,
  additionalMcpConfig?: string,
): Promise<string> {
  try {
    const baseMcpConfig = {
      mcpServers: {
        github: {
          command: "docker",
          args: [
            "run",
            "-i",
            "--rm",
            "-e",
            "GITHUB_PERSONAL_ACCESS_TOKEN",
            "ghcr.io/anthropics/github-mcp-server:sha-7382253",
          ],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
          },
        },
        github_file_ops: {
          command: "bun",
          args: [
            "run",
            `${process.env.GITHUB_ACTION_PATH}/src/mcp/github-file-ops-server.ts`,
          ],
          env: {
            GITHUB_TOKEN: githubToken,
            REPO_OWNER: owner,
            REPO_NAME: repo,
            BRANCH_NAME: branch,
            REPO_DIR: process.env.GITHUB_WORKSPACE || process.cwd(),
          },
        },
      },
    };

    // Merge with additional MCP config if provided
    if (additionalMcpConfig && additionalMcpConfig.trim()) {
      try {
        const additionalConfig = JSON.parse(additionalMcpConfig);

        // Merge mcpServers objects, with additional config overriding base config
        if (additionalConfig.mcpServers) {
          baseMcpConfig.mcpServers = {
            ...baseMcpConfig.mcpServers,
            ...additionalConfig.mcpServers,
          };
        }

        // Merge any other top-level properties from additional config
        const mergedConfig = {
          ...baseMcpConfig,
          ...additionalConfig,
          mcpServers: baseMcpConfig.mcpServers, // Ensure mcpServers uses the merged version
        };

        return JSON.stringify(mergedConfig, null, 2);
      } catch (parseError) {
        core.warning(
          `Failed to parse additional MCP config: ${parseError}. Using base config only.`,
        );
      }
    }

    return JSON.stringify(baseMcpConfig, null, 2);
  } catch (error) {
    core.setFailed(`Install MCP server failed with error: ${error}`);
    process.exit(1);
  }
}
