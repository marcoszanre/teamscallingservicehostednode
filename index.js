// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const request = require('request');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');

// This bot's main dialog.
const { MyBot } = require('./bot');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();

server.use(restify.plugins.bodyParser({
    maxBodySize: 0,
    mapParams: true
}));

server.listen(process.env.port || process.env.PORT || 8080, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
};

// Create the main dialog.
const myBot = new MyBot();

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await myBot.run(context);
    });
});

server.post('/api/calls', (req, res) => {

    let CommID = req.body.value[0].resourceData.id;
    
    console.log(CommID);

    let tokenResponse = process.env.AccessToken
    
    let answergraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/answer';
    
    console.log(answergraphURL);

            request.post(
                {
                    url:answergraphURL,
                    json: 
                    {
                        "callbackUri": "https://51952517.ngrok.io/api/calls/hub",
                        "acceptedModalities": [ "audio" ],
                        "mediaConfig": {
                            "@odata.type": "#microsoft.graph.serviceHostedMediaConfig"
                        }
                    }
            }).auth(null, null, true, tokenResponse), function(err,httpResponse,body)
            {
                if (err) {
                    console.log(err);
                }
                console(body);
                res.send(200);
            };
});

server.post('/api/calls/hub', (req, res) => { 

    let CommID = req.body.value[0].resourceUrl.split("/")[3];
    
    let tokenResponse = process.env.AccessToken

    switch(req.body.value[0].resourceData.state) {
        
        // CALL SENDO ESTABELECIDA
        case 'establishing':
        console.log('The call is being established');
        res.send(200);
        break;

        // CALL ESTABELECIDA
        case 'established':
        console.log('Call Established :)');

        let playPromptgraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/playPrompt';

        // PLAY PROMPT
        request.post(
            {
                url:playPromptgraphURL,
                json: 
                {
                    "clientContext": "playprompt-client-context",
                    "prompts": [
                        {
                        "@odata.type": "#microsoft.graph.mediaPrompt",
                        "mediaInfo": {
                            "@odata.type": "#microsoft.graph.mediaInfo",
                            "uri": "https://sazanre.blob.core.windows.net/blob/bot-incoming.wav",
                            "resourceId": "2G6DE2D4-CD51-4309-8DAA-70768651088E"
                        }
                        }
                    ],
                    "loop": false
                }
        }).auth(null, null, true, tokenResponse), function(err,httpResponse,body)
        {
            if (err) {
                console.log(err);
            }
            console(body);
            res.send(200);
        };

        res.send(200);
        break;

        // CALL TERMINADA
        case 'terminated':
        console.log('Call Terminated');
        res.send(200);
        break;

        default:
        console.log('Ops... Leverage ngrok inspector for additional fields');
        console.log(req.body.value[0])
        console.log('____________________________________________________________________');
        res.send(200);
    }
});