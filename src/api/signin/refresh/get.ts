import { Request, Response } from "express";
const request = require("request");

function log(...args: any[]) {
    console.log(`GET /signin/: \x1b[33m${Array.from(arguments)}\x1b[0m`);
}

module.exports = (req: Request, res: Response) => {
    if (!req.query.refreshToken) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Missing refreshToken"
        }));
        return;
    }

    let refreshToken = req.query.refreshToken;
    request.post({
        url: 'https://discordapp.com/api/oauth2/token',
        form: {
            client_id: process.env.discord_client,
            client_secret: process.env.discord_secret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            redirect_uri: "http://uwpcommunity-site-backend.herokuapp.com/signin/redirect",
            scope: "identify guilds"
        }
    }, (err: Error, httpResponse: any, body: string) => {
        res.end(body);
    });
};


interface IDiscordAuthResponse {
    "access_token": string;
    "token_type": "Bearer"
    "expires_in": number,
    "refresh_token": string,
    "scope": string;
};