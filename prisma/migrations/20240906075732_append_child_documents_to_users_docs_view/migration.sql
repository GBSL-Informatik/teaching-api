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
            -- get all documents where the user is the author
            -- including all child documents
            WITH RECURSIVE document_hierarchy AS (
                -- Anchor member: select the root document
                SELECT
                    document_roots.id AS document_root_id,
                    documents.id AS document_id,
                    documents.author_id AS user_id,
                    document_roots.access AS access,
                    NULL::uuid AS root_user_permission_id,
                    NULL::uuid AS root_group_permission_id,
                    NULL::uuid AS group_id
                FROM 
                    document_roots
                    INNER JOIN documents ON document_roots.id = documents.document_root_id
                WHERE documents.parent_id IS NULL  -- Assuming root documents have parent_id as NULL

                UNION ALL

                -- Recursive member: select child documents with the parent's author as the user 
                SELECT
                    document_roots.id AS document_root_id,
                    child_documents.id AS document_id,
                    document_hierarchy.user_id AS user_id,
                    document_roots.access AS access,
                    NULL::uuid AS root_user_permission_id,
                    NULL::uuid AS root_group_permission_id,
                    NULL::uuid AS group_id
                FROM 
                    document_hierarchy
                    INNER JOIN documents AS child_documents ON document_hierarchy.document_id = child_documents.parent_id
                    INNER JOIN document_roots ON document_roots.id = child_documents.document_root_id
            ) 
            SELECT 
                document_root_id,
                user_id,
                access,
                document_id,
                root_user_permission_id,
                root_group_permission_id,
                group_id
            FROM document_hierarchy
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
                LEFT JOIN documents ON document_roots.id=documents.document_root_id
                LEFT JOIN root_user_permissions rup 
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
                sg_to_user."B" AS user_id,
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
                LEFT JOIN "_StudentGroupToUser" sg_to_user 
                    ON (
                        sg_to_user."A"=sg.id 
                        AND (
                            sg_to_user."B"=documents.author_id
                            OR documents.author_id is null
                        )
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
                INNER JOIN root_group_permissions rgp 
                    ON (
                        document_roots.id=rgp.document_root_id 
                        AND rgp.access >= document_roots.shared_access
                    )
                INNER JOIN student_groups sg ON rgp.student_group_id=sg.id
                LEFT JOIN documents ON document_roots.id=documents.document_root_id
                LEFT JOIN "_StudentGroupToUser" sg_to_user 
                    ON (
                        sg_to_user."A"=sg.id 
                        AND sg_to_user."B"!=documents.author_id
                    )
            WHERE sg_to_user."B" is not null
    ) as doc_user_permissions;