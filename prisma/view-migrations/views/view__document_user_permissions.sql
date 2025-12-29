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
WHERE access_rank = 1