from rest_framework.exceptions import NotFound

from app.helpdesk.models import Category


def get_category(category_id: int) -> Category:
    if category := Category.objects.filter(id=category_id).first():
        return category
    
    raise NotFound("Category not found.")