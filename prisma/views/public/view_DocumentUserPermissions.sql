SELECT
  DISTINCT ranked_permissions.document_root_id,
  ranked_permissions.user_id,
  ranked_permissions.access,
  ranked_permissions.document_id,
  ranked_permissions.root_user_permission_id,
  ranked_permissions.root_group_permission_id,
  ranked_permissions.group_id
FROM
  (
    SELECT
      document_user_permissions.document_root_id,
      document_user_permissions.user_id,
      document_user_permissions.access,
      document_user_permissions.document_id,
      document_user_permissions.root_user_permission_id,
      document_user_permissions.root_group_permission_id,
      document_user_permissions.group_id,
      row_number() OVER (
        PARTITION BY document_user_permissions.document_root_id,
        document_user_permissions.user_id
        ORDER BY
          document_user_permissions.access DESC
      ) AS rn
    FROM
      (
        SELECT
          document_roots.id AS document_root_id,
          documents.author_id AS user_id,
          document_roots.access,
          documents.id AS document_id,
          NULL :: uuid AS root_user_permission_id,
          NULL :: uuid AS root_group_permission_id,
          NULL :: uuid AS group_id
        FROM
          (
            document_roots
            JOIN documents ON ((document_roots.id = documents.document_root_id))
          )
        UNION
        SELECT
          document_roots.id AS document_root_id,
          rup.user_id,
          rup.access,
          documents.id AS document_id,
          rup.id AS root_user_permission_id,
          NULL :: uuid AS root_group_permission_id,
          NULL :: uuid AS group_id
        FROM
          (
            (
              document_roots
              JOIN documents ON ((document_roots.id = documents.document_root_id))
            )
            JOIN root_user_permissions rup ON (
              (
                (document_roots.id = rup.document_root_id)
                AND (
                  (documents.author_id = rup.user_id)
                  OR (rup.access >= document_roots.shared_access)
                )
              )
            )
          )
        UNION
        SELECT
          document_roots.id AS document_root_id,
          documents.author_id AS user_id,
          rgp.access,
          documents.id AS document_id,
          NULL :: uuid AS root_user_permission_id,
          rgp.id AS root_group_permission_id,
          sg.id AS group_id
        FROM
          (
            (
              (
                (
                  document_roots
                  JOIN documents ON ((documents.document_root_id = document_roots.id))
                )
                JOIN root_group_permissions rgp ON ((document_roots.id = rgp.document_root_id))
              )
              JOIN student_groups sg ON ((rgp.student_group_id = sg.id))
            )
            JOIN "_StudentGroupToUser" sg_to_user ON (
              (
                (sg_to_user."A" = sg.id)
                AND (sg_to_user."B" = documents.author_id)
              )
            )
          )
        UNION
        SELECT
          document_roots.id AS document_root_id,
          sg_to_user."B" AS user_id,
          rgp.access,
          documents.id AS document_id,
          NULL :: uuid AS root_user_permission_id,
          rgp.id AS root_group_permission_id,
          sg.id AS group_id
        FROM
          (
            (
              (
                (
                  document_roots
                  JOIN documents ON ((document_roots.id = documents.document_root_id))
                )
                JOIN root_group_permissions rgp ON (
                  (
                    (document_roots.id = rgp.document_root_id)
                    AND (rgp.access >= document_roots.shared_access)
                  )
                )
              )
              JOIN student_groups sg ON ((rgp.student_group_id = sg.id))
            )
            JOIN "_StudentGroupToUser" sg_to_user ON (
              (
                (sg_to_user."A" = sg.id)
                AND (sg_to_user."B" <> documents.author_id)
              )
            )
          )
      ) document_user_permissions
  ) ranked_permissions
WHERE
  (ranked_permissions.rn = 1);