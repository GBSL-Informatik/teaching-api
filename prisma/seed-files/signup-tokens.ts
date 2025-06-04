import { Prisma } from '@prisma/client';

export const PERPETUAL_SIGNUP_TOKEN_ID = '821130b5-5870-4d01-a2a0-2ce0193eb365';
export const SINGLE_USE_SIGNUP_TOKEN_ID = 'c83be8f1-f9bf-4bd3-b9d2-843c59a5ae77';
export const USED_SINGLE_USE_SIGNUP_TOKEN_ID = 'bd68d9fa-e58a-4710-ade3-ac497c43d5b2';
export const EXPIRING_SIGNUP_TOKEN_ID = '0e68c380-697f-46f6-9e57-65be9b30ed09';
export const EXPIRED_SIGNUP_TOKEN_ID = '580a9eaf-3a03-4a33-b5a9-1be3c2733b64';
export const DISABLED_SIGNUP_TOKEN_ID = '6cc03a8d-4213-42b4-8745-92b85223e84b';
export const NEW_CLASS_SIGNUP_TOKEN_ID = 'feafd16d-eacc-483f-af92-13640740b575';

export const signupTokens: Prisma.SignupTokenCreateManyInput[] = [
    {
        id: PERPETUAL_SIGNUP_TOKEN_ID,
        description: 'Ein MSAL Signup Token, das uneingeschränkt verwendet werden kann.',
        method: 'msal'
    },
    {
        id: SINGLE_USE_SIGNUP_TOKEN_ID,
        description: 'Ein Signup Token, mit dem man sich einmalig registrieren kann.',
        method: 'github',
        maxUses: 1
    },
    {
        id: USED_SINGLE_USE_SIGNUP_TOKEN_ID,
        description: 'Ein GitHub Signup Token, das bereits verwendet wurde.',
        method: 'github',
        uses: 1,
        maxUses: 1
    },
    {
        id: EXPIRING_SIGNUP_TOKEN_ID,
        description: 'Ein Signup Token, das bis 2050 gültig ist.',
        method: 'msal',
        validThrough: new Date('2050-01-01T00:00:00Z')
    },
    {
        id: EXPIRED_SIGNUP_TOKEN_ID,
        description: 'Ein Signup Token, das in 2024 abgelaugen ist.',
        method: 'msal',
        validThrough: new Date('2024-01-01T00:00:00Z')
    },
    {
        id: DISABLED_SIGNUP_TOKEN_ID,
        description: 'Ein deaktiviertes Signup Token.',
        method: 'github',
        disabled: true
    },
    {
        id: NEW_CLASS_SIGNUP_TOKEN_ID,
        description: 'Ein (relativ) realistisches Signup Token für eine neue Klasse.',
        method: 'msal',
        validThrough: new Date('2050-01-01T00:00:00Z'),
        maxUses: 23
    }
];
