select student_groups.id as id, student_groups.name, student_groups.description, parent.name as parent_group
from student_groups
         left join student_groups as parent on student_groups.parent_id = parent.id;
