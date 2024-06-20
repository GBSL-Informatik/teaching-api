export const createDataExtractor = <T extends Object>(allowedFields: (keyof T)[]) => {
    return (bodyData: T, removeNull: boolean = false) => {
        const data: Partial<T> = {};
        allowedFields.forEach((field) => {
            if (field in bodyData && bodyData[field] !== undefined) {
                if (removeNull && bodyData[field] === null) {
                    return;
                }
                data[field] = bodyData[field] as any;
            }
        });
        return data;
    };
};
