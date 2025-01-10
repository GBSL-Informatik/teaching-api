import express, { RequestHandler } from 'express';

const router = express.Router();

const githubToken: RequestHandler<any, any, any, { code: string }> = async (req, res, next) => {
    try {
        const { code } = req.query;
        console.log('im here', code);
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                // Additional parameters as needed
                redirect_uri: process.env.GITHUB_REDIRECT_URI,
                scope: 'repo,user', // Requested permissions
                code: code
            })
        });
        console.log(response);
        const githubToken = await response.json();
        res.status(200).json(githubToken);
    } catch (error) {
        console.log(error);
        next(error);
    }
};

router.get('/github-token', githubToken);

export default router;
