-- NEVER MODIFY THIS FILE MANUALLY! IT IS AUTO-GENERATED USING prisma/view-migrations/create-view-migration.ts

DROP VIEW IF EXISTS view__users_documents;

DROP VIEW IF EXISTS view__document_user_permissions;

DROP VIEW IF EXISTS view__all_document_user_permissions;


CREATE VIEW view__all_document_user_permissions AS
    -- view: view__all_document_user_permissions
    
    -- assumption: all child documents of a document share the same document_root_id
    SELECT
        document_root_id,
        user_id,
        access,
        document_id,
        root_user_permission_id,
        root_group_permission_id,
        group_id,
        ROW_NUMBER() OVER (PARTITION BY document_root_id, user_id, document_id ORDER BY access DESC) AS access_rank
    FROM (
            -- get all documents where the user **is the author**
            SELECT
                document_roots.id AS document_root_id,
                documents.author_id AS user_id,
                document_roots.access AS access,
                documents.id AS document_id,
                NULL::uuid AS root_user_permission_id,
                NULL::uuid AS root_group_permission_id,
                NULL::uuid AS group_id
            FROM
                document_roots
                INNER JOIN documents ON document_roots.id = documents.document_root_id
        UNION ALL
            -- get all documents where the user **is not the author** but has shared access
            SELECT
                document_roots.id AS document_root_id,
                all_users.id AS user_id,
                CASE 
                    WHEN document_roots.shared_access <= document_roots.access THEN document_roots.shared_access
                    ELSE document_roots.access
                END AS access,
                documents.id AS document_id,
                NULL::uuid AS root_user_permission_id,
                NULL::uuid AS root_group_permission_id,
                NULL::uuid AS group_id
            FROM 
                document_roots
                INNER JOIN documents ON document_roots.id = documents.document_root_id
                CROSS JOIN users all_users
            WHERE documents.author_id != all_users.id
                AND (
                    document_roots.shared_access='RO_DocumentRoot' 
                    OR
                    document_roots.shared_access='RW_DocumentRoot'
                )
        UNION ALL
            -- get all documents where the user has been granted shared access
            -- or the access has been extended by user permissions
            SELECT
                document_roots.id AS document_root_id,
                rup.user_id AS user_id,
                rup.access AS access,
                documents.id AS document_id,
                rup.id AS root_user_permission_id,
                NULL::uuid AS root_group_permission_id,
                NULL::uuid AS group_id
            FROM 
                document_roots
                LEFT JOIN documents ON document_roots.id=documents.document_root_id
                LEFT JOIN root_user_permissions rup 
                    ON (
                        document_roots.id = rup.document_root_id 
                        AND (
                            documents.author_id = rup.user_id
                            OR (
                                rup.access >= document_roots.shared_access
                                AND document_roots.shared_access != 'None_DocumentRoot'
                            )
                        )
                    )
            WHERE rup.user_id IS NOT NULL
        UNION ALL
            -- all group-based permissions for the documents author
            SELECT
                document_roots.id AS document_root_id,
                user_to_sg.user_id AS user_id,
                rgp.access AS access,
                documents.id AS document_id,
                NULL::uuid AS root_user_permission_id,
                rgp.id AS root_group_permission_id,
                sg.id AS group_id
            FROM 
                document_roots
                INNER JOIN root_group_permissions rgp ON document_roots.id=rgp.document_root_id
                INNER JOIN student_groups sg ON rgp.student_group_id=sg.id
                LEFT JOIN documents ON document_roots.id=documents.document_root_id
                LEFT JOIN user_student_groups user_to_sg 
                    ON (
                        user_to_sg.student_group_id=sg.id 
                        AND (
                            user_to_sg.user_id=documents.author_id
                            OR documents.author_id is null
                        )
                    )
            WHERE user_to_sg.user_id IS NOT NULL
        UNION ALL
            -- all group based permissions for the user, which is not the author
            SELECT
                document_roots.id AS document_root_id,
                user_to_sg.user_id AS user_id,
                rgp.access AS access,
                documents.id AS document_id,
                NULL::uuid AS root_user_permission_id,
                rgp.id AS root_group_permission_id,
                sg.id AS group_id
            FROM 
                document_roots
                INNER JOIN root_group_permissions rgp 
                    ON (
                        document_roots.id=rgp.document_root_id 
                        AND rgp.access >= document_roots.shared_access
                        AND document_roots.shared_access != 'None_DocumentRoot'
                    )
                INNER JOIN student_groups sg ON rgp.student_group_id=sg.id
                LEFT JOIN documents ON document_roots.id=documents.document_root_id
                LEFT JOIN user_student_groups user_to_sg 
                    ON (
                        user_to_sg.student_group_id=sg.id 
                        AND user_to_sg.user_id!=documents.author_id
                    )
            WHERE user_to_sg.user_id IS NOT NULL
    ) as doc_user_permissions;



CREATE VIEW view__document_user_permissions AS
    -- view: view__document_user_permissions
    
    SELECT
        document_root_id,
        user_id,
        access,
        document_id,
        root_user_permission_id,
        root_group_permission_id,
        group_id
    FROM view__all_document_user_permissions
    WHERE access_rank = 1;



CREATE VIEW view__users_documents AS
    -- view: view__users_documents
    
    SELECT
        view__document_user_permissions.user_id AS user_id,
        document_roots.*,
        COALESCE(
            JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT(
                    'id', view__document_user_permissions.root_group_permission_id,
                    'access', view__document_user_permissions.access,
                    'groupId', view__document_user_permissions.group_id
                )
            ) FILTER (WHERE view__document_user_permissions.root_group_permission_id IS NOT NULL),
            '[]'::jsonb
        ) AS "groupPermissions",
        COALESCE(
            JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT(
                    'id', view__document_user_permissions.root_user_permission_id,
                    'access', view__document_user_permissions.access,
                    'userId', view__document_user_permissions.user_id
                )
            ) FILTER (WHERE view__document_user_permissions.root_user_permission_id IS NOT NULL),
            '[]'::jsonb
        ) AS "userPermissions",
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', d.id,
                    'authorId', d.author_id,
                    'type', d.type,
                    'data', CASE WHEN (view__document_user_permissions.access='None_DocumentRoot' OR view__document_user_permissions.access='None_StudentGroup' OR view__document_user_permissions.access='None_User') THEN NULL ELSE d.data END,
                    'parentId', d.parent_id,
                    'documentRootId', d.document_root_id,
                    'createdAt', d.created_at,
                    'updatedAt', d.updated_at
                )
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'::jsonb
        ) AS documents
    FROM
        document_roots
            LEFT JOIN view__document_user_permissions ON document_roots.id=view__document_user_permissions.document_root_id
            LEFT JOIN documents d ON document_roots.id=d.document_root_id AND view__document_user_permissions.document_id=d.id
    WHERE view__document_user_permissions.user_id IS NOT NULL
    GROUP BY document_roots.id, view__document_user_permissions.user_id;
