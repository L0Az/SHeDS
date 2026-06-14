from rest_framework.exceptions import NotFound

from app.helpdesk.models import Department


def get_department(department_id: int) -> Department:
    if department := Department.objects.filter(id=department_id).first():
        return department

    raise NotFound("Department not found.")
