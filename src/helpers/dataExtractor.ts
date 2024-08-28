export const createDataExtractor = <T extends Object>(
    allowedFields: (keyof T)[],
    adminOnly: (keyof T)[] = []
) => {
    return (bodyData: T, removeNull: boolean = false, isAdmin: boolean = false) => {
        const data: Partial<T> = {};
        const fieldSet = new Set(allowedFields);
        if (isAdmin) {
            adminOnly.forEach((field) => {
                fieldSet.add(field);
            });
        }
        [...fieldSet].forEach((field) => {
            if (bodyData && field in bodyData && bodyData[field] !== undefined) {
                if (removeNull && bodyData[field] === null) {
                    return;
                }
                data[field] = bodyData[field] as any;
            }
        });
        return data;
    };
};
