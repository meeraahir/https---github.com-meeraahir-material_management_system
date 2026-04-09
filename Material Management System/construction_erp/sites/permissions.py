from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Read access for authenticated users, write access for staff and above,
    delete access for managers and admins.
    """

    write_roles = {'admin', 'manager', 'staff'}
    delete_roles = {'admin', 'manager'}

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        if not (request.user and request.user.is_authenticated):
            return False

        role = getattr(request.user, 'role', None)
        if request.method == 'DELETE':
            return role in self.delete_roles
        return role in self.write_roles
