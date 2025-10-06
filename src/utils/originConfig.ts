const DEV_ORIGIN = 'localhost:3000';

/**
 * splits the origins and removes duplicates
 */
const splitOrigins = (origins: string) => {
    return [
        ...new Set(
            origins
                .split(',')
                .map((origin) => origin.trim())
                .filter(Boolean)
        )
    ];
};

// Read CORS configuration from environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS ? splitOrigins(process.env.ALLOWED_ORIGINS) : [DEV_ORIGIN];
const allowSubdomains = process.env.ALLOW_SUBDOMAINS === 'true';
const netlifyProjectName = process.env.NETLIFY_PROJECT_NAME;

// Build the CORS origin array
export const CORS_ORIGIN: (string | RegExp)[] = [];
export const CORS_ORIGIN_STRINGIFIED: string[] = [];

const isLoclhost = (origin: string) => {
    return origin.startsWith('localhost') || origin.startsWith('127.0.0.1');
};

// Process additional allowed origins
allowedOrigins.forEach((origin) => {
    origin = origin.trim();

    if (!origin) {
        return;
    }
    if (isLoclhost(origin)) {
        CORS_ORIGIN_STRINGIFIED.push(`http://${origin}`);
        return CORS_ORIGIN.push(`http://${origin}`);
    }

    if (allowSubdomains) {
        if (origin.startsWith('http')) {
            const [protocol, host] = origin.split('://');
            CORS_ORIGIN_STRINGIFIED.push(`$${protocol}://*.${host}`, origin);
        } else {
            CORS_ORIGIN_STRINGIFIED.push(`*.${origin}`, `https://${origin}`);
        }
        // Escape dots and create regex for domain with optional subdomains
        const escapedDomain = origin.replace(/\./g, '\\.');
        CORS_ORIGIN.push(new RegExp(`^https?://(.*\\.)?${escapedDomain}$`, 'i'));
    } else {
        // Add exact domain match (ensuring it has protocol)
        if (!origin.startsWith('http')) {
            origin = `https://${origin}`;
        }
        CORS_ORIGIN_STRINGIFIED.push(origin);
        CORS_ORIGIN.push(origin);
    }
});

// Add Netlify deploy previews if enabled
if (netlifyProjectName) {
    CORS_ORIGIN.push(new RegExp(`https://deploy-preview-\\d+--${netlifyProjectName}\\.netlify\\.app$`, 'i'));
    CORS_ORIGIN_STRINGIFIED.push(`https://*.${netlifyProjectName}.netlify.app`);
}

export const SAME_SITE = allowedOrigins.length > 1 || netlifyProjectName ? 'none' : 'strict';
