SELECT
  DISTINCT doc_user_permissions.document_root_id,
  doc_user_permissions.user_id,
  doc_user_permissions.access,
  doc_user_permissions.document_id,
  doc_user_permissions.root_user_permission_id,
  doc_user_permissions.root_group_permission_id,
  doc_user_permissions.group_id
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
          LEFT JOIN documents ON ((document_roots.id = documents.document_root_id))
        )
        LEFT JOIN root_user_permissions rup ON (
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
              JOIN root_group_permissions rgp ON ((document_roots.id = rgp.document_root_id))
            )
            JOIN student_groups sg ON ((rgp.student_group_id = sg.id))
          )
          LEFT JOIN documents ON ((document_roots.id = documents.document_root_id))
        )
        LEFT JOIN "_StudentGroupToUser" sg_to_user ON (
          (
            (sg_to_user."A" = sg.id)
            AND (
              (sg_to_user."B" = documents.author_id)
              OR (documents.author_id IS NULL)
            )
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
              JOIN root_group_permissions rgp ON (
                (
                  (document_roots.id = rgp.document_root_id)
                  AND (rgp.access >= document_roots.shared_access)
                )
              )
            )
            JOIN student_groups sg ON ((rgp.student_group_id = sg.id))
          )
          LEFT JOIN documents ON ((document_roots.id = documents.document_root_id))
        )
        LEFT JOIN "_StudentGroupToUser" sg_to_user ON (
          (
            (sg_to_user."A" = sg.id)
            AND (sg_to_user."B" <> documents.author_id)
          )
        )
      )
    WHERE
      (sg_to_user."B" IS NOT NULL)
  ) doc_user_permissions;