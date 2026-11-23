from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.utils.auth import get_current_user, require_role, UserRole, CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


class RoleSwitchRequest(BaseModel):
    role: UserRole


@router.get("/me")
def get_current_user_profile(user: CurrentUser = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns current user session, authenticated role, and capabilities.
    """
    capabilities = {
        UserRole.OPERATIONS_MANAGER: [
            "generate_roster",
            "validate_roster",
            "publish_roster",
            "branch_version",
            "manage_employees",
            "manage_brands",
            "manage_processes",
            "manage_pods",
            "manage_assignments",
            "approve_leaves",
            "resolve_conflicts",
            "manage_shifts",
            "export_csv"
        ],
        UserRole.POD_LEAD: [
            "view_roster",
            "view_pod_members",
            "request_leaves",
            "view_coverage",
            "resolve_conflicts",
            "export_csv"
        ],
        UserRole.EMPLOYEE: [
            "view_self_roster",
            "request_leaves",
            "view_own_availability"
        ]
    }
    return {
        "user": user.model_dump(),
        "capabilities": capabilities.get(user.role, []),
    }


@router.get("/roles")
def list_available_roles() -> List[Dict[str, str]]:
    """
    Lists available system roles for RBAC testing and selection.
    """
    return [
        {"role": UserRole.OPERATIONS_MANAGER.value, "description": "Full administrative control, roster generation, and publishing"},
        {"role": UserRole.POD_LEAD.value, "description": "Pod-level scheduling review, conflict resolution, and member management"},
        {"role": UserRole.EMPLOYEE.value, "description": "Frontline access for shift schedule viewing and leave requests"},
    ]
