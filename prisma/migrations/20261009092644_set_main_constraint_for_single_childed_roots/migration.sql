UPDATE documents
    SET uniq_on_root_constraint = 'main'
WHERE parent_id IS NULL AND id::text IN (
    SELECT documents->0->>'id' 
    FROM view__users_documents 
    WHERE jsonb_array_length(documents) = 1 
     AND documents->0->>'type' NOT IN (
        'dynamic_document_roots',
        'mdx_comment',
        'cms_text'
    )
)