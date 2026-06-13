from rest_framework.permissions import BasePermission, DjangoModelPermissions

from app.accounts import choices as accounts_choices

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

_OBJ_PERM_MAP = {
    "GET": "accounts.view_user",
    "HEAD": "accounts.view_user",
    "OPTIONS": None,
    "POST": "accounts.add_user",
    "PUT": "accounts.change_user",
    "PATCH": "accounts.change_user",
    "DELETE": "accounts.delete_user",
}


def _is_admin(user):
    return user.is_authenticated and user.type == accounts_choices.ADMIN_USER_TYPE


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _is_admin(request.user)


class AdminOrModelPermissions(DjangoModelPermissions):
    perms_map = {
        **DjangoModelPermissions.perms_map,
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
    }

    def has_permission(self, request, view):
        if _is_admin(request.user):
            return True
        return super().has_permission(request, view)


class AdminOrObjectPermissions(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if _is_admin(request.user):
            return True
        perm = _OBJ_PERM_MAP.get(request.method)
        if perm is None:
            return True
        return request.user.has_perm(perm, obj)
