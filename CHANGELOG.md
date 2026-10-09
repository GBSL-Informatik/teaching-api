# Changelog
## 09.10.2026

Introduced new columns `uniq_on_parent_constraint` and `uniq_on_root_constraint` to the `documents` table to enforce client specified uniqueness constraints.

The `uniq_on_parent_constraint` is possible to fail, so the migration was not applied by default. Do it by hand:
```sql
UPDATE documents
SET uniq_on_parent_constraint = data->>'qid'
WHERE parent_id is not null and data->>'qid' is not null;
```
and find duplicates and handle them by hand:

```sql
select count(data->>'qid'), array_agg(id) as ids, data->>'qid', author_id, document_root_id, parent_id
    from documents
    where data->>'qid' is not null
    group by data->>'qid', author_id, document_root_id, parent_id
    order by count(data->>'qid') desc
    limit 100;
```