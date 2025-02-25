import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { findSimilarProjectName, GetDiscordUser, genericServerError } from '../../common/helpers';
import { IProject, IDiscordUser } from "../../models/types";

module.exports = (req: Request, res: Response) => {
    const body = req.body;

    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "${queryCheck}" not provided or malformed`
        }));
        return;
    }

    const bodyCheck = checkIProject(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        }));
        return;
    }
    (async () => {
        const user = await GetDiscordUser(req.body.accessToken).catch((err) => genericServerError(err, res));
        if (!user) {
            res.status(401);
            res.end(`Invalid accessToken`);
            return;
        }

        let discordId = (user as IDiscordUser).id;

        updateProject(body, discordId, req.query.appName)
            .then(results => {
                res.end("Success");
            })
            .catch((err) => genericServerError(err, res));
    })();
};

function checkQuery(query: any): true | string {
    if (!query.accessToken) return "accessToken";
    if (!query.appName) return "appName";

    return true;
}
function checkIProject(body: IProject): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function updateProject(projectUpdateData: IProject, discordId: string, appName: string): Promise<Project> {
    return new Promise<Project>((resolve, reject) => {

        Project.findAll({
            include: [{
                model: User,
                where: { discordId: discordId }
            }]
        }).then(projects => {
            if (projects.length === 0) { reject(`Projects with ID ${discordId} not found`); return; }

            // Filter out the correct app name
            const project = projects.filter(project => JSON.parse(JSON.stringify(project)).appName == appName);

            let similarAppName = findSimilarProjectName(projects, appName);
            if (project.length === 0) { reject(`Project with name "${appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].update({ ...projectUpdateData })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}
