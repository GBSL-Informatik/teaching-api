-- AlterEnum
BEGIN;
ALTER TYPE "Access" RENAME VALUE 'RO' TO 'RO_DocumentRoot';
ALTER TYPE "Access" RENAME VALUE 'RW' TO 'RW_DocumentRoot';
ALTER TYPE "Access" RENAME VALUE 'None' TO 'None_DocumentRoot';

ALTER TYPE "Access" ADD VALUE 'RO_StudentGroup' AFTER 'None_DocumentRoot';
ALTER TYPE "Access" ADD VALUE 'RW_StudentGroup' AFTER 'RO_StudentGroup';
ALTER TYPE "Access" ADD VALUE 'None_StudentGroup' AFTER 'RW_StudentGroup';
ALTER TYPE "Access" ADD VALUE 'RO_User' AFTER 'None_StudentGroup';
ALTER TYPE "Access" ADD VALUE 'RW_User' AFTER 'RO_User';
ALTER TYPE "Access" ADD VALUE 'None_User' AFTER 'RW_User';
COMMIT;

CREATE OR REPLACE VIEW view__users_documents AS
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