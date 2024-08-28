CREATE INDEX document_root_id_index ON document_roots (id);
CREATE INDEX document_author_id_index ON documents (author_id);
CREATE INDEX root_user_permissions_user_id_index ON root_user_permissions (user_id);
CREATE INDEX root_user_permissions_document_root_id_index ON root_user_permissions (document_root_id);

CREATE OR REPLACE VIEW view__document_user_permissions AS
    SELECT DISTINCT
        document_root_id,
        user_id,
        access,
        document_id,
        root_user_permission_id,
        root_group_permission_id,
        group_id
    FROM (
        SELECT
            document_root_id,
            user_id,
            access,
            document_id,
            root_user_permission_id,
            root_group_permission_id,
            group_id,
            ROW_NUMBER() OVER (PARTITION BY document_root_id, user_id ORDER BY access DESC) AS rn  -- rank by access level
        FROM (
                -- get all documents where the user is the author
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
                    INNER JOIN documents ON document_roots.id=documents.document_root_id
            UNION
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
                    INNER JOIN documents ON document_roots.id=documents.document_root_id
                    INNER JOIN root_user_permissions rup 
                        ON (
                            document_roots.id = rup.document_root_id 
                            AND (
                                documents.author_id = rup.user_id
                                OR
                                rup.access >= document_roots.shared_access
                            )
                        )
            UNION
                -- all group-based permissions for the documents author
                SELECT
                    document_roots.id AS document_root_id,
                    documents.author_id AS user_id,
                    rgp.access AS access,
                    documents.id AS document_id,
                    NULL::uuid AS root_user_permission_id,
                    rgp.id AS root_group_permission_id,
                    sg.id AS group_id
                FROM 
                    document_roots
                    INNER JOIN documents ON documents.document_root_id=document_roots.id
                    INNER JOIN root_group_permissions rgp ON document_roots.id=rgp.document_root_id
                    INNER JOIN student_groups sg ON rgp.student_group_id=sg.id
                    INNER JOIN "_StudentGroupToUser" sg_to_user 
                        ON (
                            sg_to_user."A"=sg.id 
                            AND sg_to_user."B"=documents.author_id
                        )
            UNION
                -- all group based permissions for the user, which is not the author
                SELECT
                    document_roots.id AS document_root_id,
                    sg_to_user."B" AS user_id,
                    rgp.access AS access,
                    documents.id AS document_id,
                    NULL::uuid AS root_user_permission_id,
                    rgp.id AS root_group_permission_id,
                    sg.id AS group_id
                FROM 
                    document_roots
                    INNER JOIN documents ON document_roots.id=documents.document_root_id
                    INNER JOIN root_group_permissions rgp 
                        ON (
                            document_roots.id=rgp.document_root_id 
                            AND rgp.access >= document_roots.shared_access
                        )
                    INNER JOIN student_groups sg ON rgp.student_group_id=sg.id
                    INNER JOIN "_StudentGroupToUser" sg_to_user 
                        ON (
                            sg_to_user."A"=sg.id 
                            AND sg_to_user."B"!=documents.author_id
                        )
        ) AS document_user_permissions
    ) AS ranked_permissions
    WHERE rn = 1; -- filter out all but the highest ranked permission