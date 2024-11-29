-- assumption: all child documents of a document share the same document_root_id

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
                            OR
                            rup.access >= document_roots.shared_access
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
            WHERE sg_to_user."B" IS NOT NULL
    ) as doc_user_permissions;
