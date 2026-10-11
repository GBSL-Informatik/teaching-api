-- NEVER MODIFY THIS FILE MANUALLY! IT IS AUTO-GENERATED USING prisma/view-migrations/create-view-migration.ts

DROP VIEW IF EXISTS view__users_documents;


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
                    'documentRootId', d.document_root_id,
                    'createdAt', d.created_at,
                    'updatedAt', d.updated_at
                )
                || CASE WHEN d.parent_id IS NOT NULL
                    THEN JSONB_BUILD_OBJECT('parentId', d.parent_id)
                    ELSE '{}'::jsonb
                END
                || CASE WHEN d.uniq_on_root_constraint IS NOT NULL
                    THEN JSONB_BUILD_OBJECT('uniqOnRoot', d.uniq_on_root_constraint)
                    ELSE '{}'::jsonb
                END
                || CASE WHEN d.uniq_on_parent_constraint IS NOT NULL
                    THEN JSONB_BUILD_OBJECT('uniqOnParent', d.uniq_on_parent_constraint)
                    ELSE '{}'::jsonb
                END
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'::jsonb
        ) AS documents
    FROM
        document_roots
            LEFT JOIN view__document_user_permissions ON document_roots.id=view__document_user_permissions.document_root_id
            LEFT JOIN documents d ON document_roots.id=d.document_root_id AND view__document_user_permissions.document_id=d.id
    WHERE view__document_user_permissions.user_id IS NOT NULL
    GROUP BY document_roots.id, view__document_user_permissions.user_id;
