# Changelog
## 09.10.2026

Introduced new columns `uniq_on_parent_constraint` and `uniq_on_root_constraint` to the `documents` table to enforce client specified uniqueness constraints.


### Special document types needing manual migration

#### Assessable documents

The `uniq_on_parent_constraint` ensures a quiz only ever has one uniq `qid` per user. The migration must be done manually:

1. Check whether there are duplicates:

    ```sql
    SELECT
        COUNT(data->>'qid') AS duplication_count,
        ARRAY_AGG(id) AS ids,
        data->>'qid' AS qid,
        author_id,
        document_root_id,
        parent_id
    FROM documents
    WHERE data->>'qid' IS NOT NULL
    GROUP BY data->>'qid', author_id, document_root_id, parent_id
    HAVING COUNT(data->>'qid') > 1
    ORDER BY duplication_count DESC;
    ```
2. Handle duplicates: proposed is the solution to only keep the most recent document and delete the others:
    ```sql
    WITH ranked AS (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY data->>'qid', author_id, document_root_id, parent_id
                ORDER BY created_at DESC NULLS LAST, id DESC
            ) AS rn
        FROM documents
        WHERE data->>'qid' IS NOT NULL
    )
    DELETE FROM documents d
    USING ranked r
    WHERE d.id = r.id
    AND r.rn > 1
    RETURNING d.*;
    ```
3. Update the `uniq_on_parent_constraint` for all assessable documents that have a `qid`:
    ```sql
    UPDATE documents
    SET uniq_on_parent_constraint = data->>'qid'
    WHERE parent_id is not null and data->>'qid' is not null;
    ```

#### children of `mdx_comment`

Per `mdx_comment` exists one uniq `quill_v2` child: add the constraint:

```sql
UPDATE documents
SET uniq_on_parent_constraint = 'comment'
WHERE type='quill_v2' and parent_id in (select id from documents where type='mdx_comment');
```

#### children of `file` documents

Per `file` document exists one uniq `file` child: add the constraint:

```sql
UPDATE documents
SET uniq_on_parent_constraint = 'file'
WHERE parent_id in (select id from documents where type='file');
```

#### `cms_text` documents

Check wheter there are multiple `cms_text`s per user linked to the same document root:

```sql
select document_root_id, author_id, count(id), array_agg(id)
from documents
where type='cms_text'
group by document_root_id, author_id
order by count(id) desc
```

If so, keep only the most recent one and delete the others, before you add the `uniq_on_root_constraint` to the remaining `cms_text` documents.

```sql
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY document_root_id, author_id
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM documents
    WHERE type = 'cms_text'
)
DELETE FROM documents d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1
RETURNING d.*;
```

and finally, update the `uniq_on_root_constraint` for the remaining `cms_text` documents:

```sql
UPDATE documents
SET uniq_on_root_constraint = 'main'
WHERE type='cms_text';
```

#### `dir` documents

Check wheter there are multiple `dir`s per user linked to the same document root. Make sure to check that the `parent_id` is null, as we only want to enforce uniqueness on the root `dir` documents.

```sql
SELECT document_root_id, author_id, count(id), array_agg(id)
FROM documents
WHERE type='dir' AND parent_id is null
GROUP BY document_root_id, author_id
ORDER BY count(id) DESC;
```

if there are no duplicates, proceed with step 3 directly.

1. Check for duplicates explicitely:
    ```sql
    WITH root_ids AS (
        SELECT unnest(array_agg(id)) AS id
        FROM documents
        WHERE type = 'dir'
        AND parent_id IS NULL
        GROUP BY document_root_id, author_id
        HAVING COUNT(id) > 1
    )
    SELECT
        r.id,
        COUNT(d.id) AS document_count
    FROM root_ids r
    LEFT JOIN documents d ON d.parent_id = r.id
    GROUP BY r.id
    ORDER BY document_count DESC;
    ```
2. delete every duplicated `dir` document, where the document_count is 0 (meaning we don't have to manually decide which one to keep - in case you have multiple `dir` documents with children, you will have to manually decide which one to keep):

    ```sql
    WITH root_ids AS (
        SELECT unnest(array_agg(id)) AS id
        FROM documents
        WHERE type = 'dir'
        AND parent_id IS NULL
        GROUP BY document_root_id, author_id
        HAVING COUNT(id) > 1
    ),
    empty_roots AS (
        SELECT r.id
        FROM root_ids r
        LEFT JOIN documents d ON d.parent_id = r.id
        GROUP BY r.id
        HAVING COUNT(d.id) = 0
    )
    DELETE FROM documents
    WHERE id IN (SELECT id FROM empty_roots)
    RETURNING *;
    ```

3. Finally, update the `uniq_on_root_constraint` for the remaining root documents:

    ```sql
    UPDATE documents
    SET uniq_on_root_constraint = 'main'
    WHERE type='dir' AND parent_id is null;
    ```
