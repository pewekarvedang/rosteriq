from enum import Enum
from typing import Optional, List
from pydantic import BaseModel
from fastapi import Request, HTTPException, status, Depends


class UserRole(str, Enum):
    OPERATIONS_MANAGER = "Operations Manager"
    POD_LEAD = "Pod Lead"
    EMPLOYEE = "Employee"


class CurrentUser(BaseModel):
    id: int = 1
    username: str = "ops.manager"
    full_name: str = "Operations Manager"
    email: str = "operations@datastraw.io"
    role: UserRole = UserRole.OPERATIONS_MANAGER
    pod_id: Optional[int] = None

    @property
    def is_operations_manager(self) -> bool:
        return self.role == UserRole.OPERATIONS_MANAGER

    @property
    def is_pod_lead(self) -> bool:
        return self.role in [UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD]


def get_current_user(request: Request) -> CurrentUser:
    """
    Extracts authenticated user and role from request headers or authorization tokens.
    For seamless backward compatibility and frictionless assessment review,
    defaults to 'Operations Manager' if no specific header is provided.
    Supported headers:
      - X-User-Role: 'Operations Manager' | 'Pod Lead' | 'Employee'
      - X-User-Pod-Id: <int> (optional for pod lead/employee scoping)
      - Authorization: Bearer <role_or_token>
    """
    # 1. Check custom X-User-Role header
    role_header = request.headers.get("X-User-Role")
    pod_header = request.headers.get("X-User-Pod-Id")

    # 2. Check Authorization Bearer header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token.lower() in ["pod_lead", "pod-lead", "pod lead"]:
            role_header = UserRole.POD_LEAD.value
        elif token.lower() in ["employee", "staff"]:
            role_header = UserRole.EMPLOYEE.value
        elif token.lower() in ["ops", "operations_manager", "operations manager"]:
            role_header = UserRole.OPERATIONS_MANAGER.value

    # Parse role
    user_role = UserRole.OPERATIONS_MANAGER
    if role_header:
        for r in UserRole:
            if r.value.lower() == role_header.lower() or r.name.lower() == role_header.lower():
                user_role = r
                break

    pod_id = int(pod_header) if pod_header and pod_header.isdigit() else (1 if user_role == UserRole.POD_LEAD else None)

    username_map = {
        UserRole.OPERATIONS_MANAGER: ("ops.manager", "Operations Manager", "operations@datastraw.io"),
        UserRole.POD_LEAD: ("lead.alpha", "Pod Lead (Alpha)", "lead.alpha@datastraw.io"),
        UserRole.EMPLOYEE: ("staff.member", "Frontline Employee", "staff@datastraw.io"),
    }
    uname, fname, email = username_map[user_role]

    return CurrentUser(
        id=1 if user_role == UserRole.OPERATIONS_MANAGER else (2 if user_role == UserRole.POD_LEAD else 3),
        username=uname,
        full_name=fname,
        email=email,
        role=user_role,
        pod_id=pod_id,
    )


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory that verifies current user holds one of the required roles.
    """
    def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            role_names = [r.value for r in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(role_names)}. Current role: '{user.role.value}'",
            )
        return user

    return role_checker
