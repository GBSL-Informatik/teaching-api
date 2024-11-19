
CREATE OR REPLACE VIEW view__all_document_user_permissions AS
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
            -- including all child documents
            WITH RECURSIVE 
                document_hierarchy AS (
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

                    UNION ALL -- keeps duplicates in the result set

                    -- Recursive member: select child documents with the parent's author as the user 
                    SELECT
                        document_hierarchy.document_root_id AS document_root_id,
                        child_documents.id AS document_id,
                        document_hierarchy.user_id AS user_id,
                        document_hierarchy.access AS access,
                        NULL::uuid AS root_user_permission_id,
                        NULL::uuid AS root_group_permission_id,
                        NULL::uuid AS group_id
                    FROM 
                        document_hierarchy
                        INNER JOIN documents AS child_documents ON document_hierarchy.document_id = child_documents.parent_id
                ), 
                -- get all documents where the user is **not the author**
                -- but has been granted **shared access**
                shared_doc_hierarchy AS (
                    -- Anchor member: select the root document
                    SELECT
                        document_roots.id AS document_root_id,
                        documents.id AS document_id,
                        all_users.id AS user_id,
                        CASE 
                            WHEN document_roots.shared_access <= document_roots.access THEN document_roots.shared_access
                            ELSE document_roots.access
                        END AS access,
                        NULL::uuid AS root_user_permission_id,
                        NULL::uuid AS root_group_permission_id,
                        NULL::uuid AS group_id
                    FROM 
                        document_roots
                        INNER JOIN documents ON document_roots.id = documents.document_root_id
                        CROSS JOIN users all_users
                    WHERE documents.parent_id IS NULL  -- Assuming root documents have parent_id as NULL
                        AND documents.author_id != all_users.id
                        AND document_roots.access != 'None_DocumentRoot'
                        AND document_roots.shared_access != 'None_DocumentRoot'

                    UNION ALL -- keeps duplicates in the result set

                    -- Recursive member: select child documents with the parent's author as the user 
                    SELECT
                        shared_doc_hierarchy.document_root_id AS document_root_id,
                        child_documents.id AS document_id,
                        shared_doc_hierarchy.user_id AS user_id,
                        shared_doc_hierarchy.access AS access,
                        NULL::uuid AS root_user_permission_id,
                        NULL::uuid AS root_group_permission_id,
                        NULL::uuid AS group_id
                    FROM 
                        shared_doc_hierarchy
                        INNER JOIN documents AS child_documents ON shared_doc_hierarchy.document_id = child_documents.parent_id
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
        UNION ALL
            SELECT 
                document_root_id,
                user_id,
                access,
                document_id,
                root_user_permission_id,
                root_group_permission_id,
                group_id
            FROM shared_doc_hierarchy
        UNION ALL
            -- get all documents where the user has been granted shared access
            -- or the access has been extended by user permissions
            SELECT
                document_roots.id AS document_root_id,
                rup.user_id AS user_id,
                CASE
                    WHEN documents.author_id = rup.user_id THEN rup.access
                    WHEN document_roots.shared_access = 'RO_DocumentRoot' THEN 'RO_User'
                    WHEN document_roots.shared_access = 'RW_DocumentRoot' THEN 'RW_User'
                    ELSE document_roots.shared_access
                END AS access,
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
                            OR -- shared access
                            (
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
            WHERE sg_to_user."B" IS NOT NULL
        UNION ALL
            -- all group based permissions for the user, which is not the author
            SELECT
                document_roots.id AS document_root_id,
                sg_to_user."B" AS user_id,
                CASE
                    WHEN document_roots.shared_access = 'RO_DocumentRoot' THEN 'RO_StudentGroup'
                    WHEN document_roots.shared_access = 'RW_DocumentRoot' THEN 'RW_StudentGroup'
                    ELSE document_roots.shared_access
                END AS access,
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
                LEFT JOIN "_StudentGroupToUser" sg_to_user 
                    ON (
                        sg_to_user."A"=sg.id 
                        AND sg_to_user."B"!=documents.author_id
                    )
            WHERE sg_to_user."B" IS NOT NULL
    ) as doc_user_permissions;
