import _ from 'es-toolkit/compat';

export const getNameFromEmail = (email?: string) => {
    const name = (email || '').split('@')[0] || '';
    const firstName = _.capitalize(name.split('.')[0] || '');
    const lastName = _.capitalize(name.split('.')[1] || '');
    return { firstName, lastName };
};
