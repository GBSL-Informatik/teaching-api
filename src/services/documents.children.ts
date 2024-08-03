import { Prisma } from '@prisma/client';
import prisma from '../prisma';

const childrenSql = (parentId: string) => {
    return Prisma.sql`
        WITH RECURSIVE documents_tree AS (
        -- Base case: Select root documents (assumed as those with parentId IS NULL)
        SELECT 
            id, 
            type, 
            data, 
            parent_id,
            updated_at, 
            created_at,
            author_id,
            '[]'::json as children  -- Initialize children as an empty JSON array
        FROM 
            documents
        WHERE 
            parent_id = ${parentId}

        UNION ALL

        -- Recursive case: Join to find children
        SELECT 
            d.id, 
            d.type, 
            d.data,
            d.parent_id,
            d.updated_at, 
            d.created_at, 
            d.author_id,
            -- Aggregate children into a JSON array
            json_agg(
                json_build_object(
                    'id', dt.id,
                    'type', dt.type,
                    'data', dt.data,
                    'parentId', dt.parent_id,
                    'updatedAt', dt.updated_at,
                    'createdAt', dt.created_at,
                    'authorId', dt.author_id,
                    'children', dt.children
                )
            ) as children
        FROM 
            documents d
        INNER JOIN 
            documents_tree dt ON d.id = dt.parent_id
        GROUP BY 
            d.id
    )

    -- Select final JSON structure
    SELECT 
        json_build_object(
            'id', id,
            'type', type,
            'data', data,
            'parentId', parent_id,
            'updatedAt', updated_at,
            'createdAt', created_at,
            'authorId', author_id,
            'children', children
        ) 
    FROM 
        documents_tree
    WHERE
        parent_id=${parentId}
    `;
};

export const documentsChildren = async (docId: string) => {
    return prisma.$queryRaw(childrenSql(docId));
};
