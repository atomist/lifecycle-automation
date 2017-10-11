import * as GitHubApi from "github";
import * as URL from "url";

export function api(token: string, apiUrl: string = "https://api.github.com/"): GitHubApi {
    // separate the url
    const url = URL.parse(apiUrl);

    const gitHubApi = new GitHubApi({
        debug: false,
        host: url.hostname,
        protocol: url.protocol.slice(0, -1),
        port: +url.port,
        followRedirects: false,
    });

    gitHubApi.authenticate({ type: "token", token });
    return gitHubApi;
}
