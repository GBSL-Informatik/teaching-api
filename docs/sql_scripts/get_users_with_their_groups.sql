select email, student_groups.name, student_groups.description, parent.name as parent_group
from users
         join "_StudentGroupToUser" as student_group_join on users.id = student_group_join."B"
         join student_groups on student_group_join."A" = student_groups.id
         left join student_groups as parent on student_groups.parent_id = parent.id;
