-- link assessable items to their parent quiz document
UPDATE documents d
    SET parent_id = (
        SELECT id FROM documents
        WHERE   document_root_id = d.document_root_id
            AND type = 'quiz'
            AND author_id = d.author_id
        ORDER BY created_at ASC
        LIMIT 1
    )
WHERE (d.type = 'choice_answer' or d.type = 'true_false_answer') AND d.data->>'qid' IS NOT NULL;