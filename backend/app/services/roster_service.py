import calendar
from datetime import date, datetime, timedelta
from typing import List, Optional, Set, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.roster import Roster, RosterStatus
from app.models.roster_assignment import RosterAssignment
from app.models.roster_assignment_process import RosterAssignmentProcess
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.brand_process import BrandProcess
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee_availability import EmployeeAvailability, AvailabilityType, ApprovalStatus
from app.schemas.roster import RosterCreate, RosterUpdate
from app.services.holiday_service import HolidayService
from app.services.conflict_service import ConflictService
from app.utils.calendar_utils import is_brand_process_operating_on_date


class RosterService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        year: Optional[int] = None,
        month: Optional[int] = None,
        roster_status: Optional[RosterStatus] = None
    ) -> List[Roster]:
        stmt = select(Roster)
        if year is not None:
            stmt = stmt.where(Roster.year == year)
        if month is not None:
            stmt = stmt.where(Roster.month == month)
        if roster_status is not None:
            stmt = stmt.where(Roster.status == roster_status)
        stmt = stmt.order_by(Roster.year.desc(), Roster.month.desc(), Roster.version.desc()).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, roster_id: int) -> Roster:
        roster = db.get(Roster, roster_id)
        if not roster:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Roster {roster_id} not found")
        return roster

    @staticmethod
    def create_draft(db: Session, data: RosterCreate) -> Roster:
        # Compute dates if omitted
        _, last_day = calendar.monthrange(data.year, data.month)
        start_date = data.start_date or date(data.year, data.month, 1)
        end_date = data.end_date or date(data.year, data.month, last_day)

        # Check existing version
        max_ver = db.scalar(
            select(func.max(Roster.version)).where(
                Roster.month == data.month,
                Roster.year == data.year
            )
        )
        version = (max_ver or 0) + 1

        roster = Roster(
            name=data.name,
            month=data.month,
            year=data.year,
            start_date=start_date,
            end_date=end_date,
            status=RosterStatus.DRAFT,
            version=version,
            created_by=data.created_by,
            notes=data.notes
        )
        db.add(roster)
        db.commit()
        db.refresh(roster)
        return roster

    @staticmethod
    def generate_monthly_roster(db: Session, roster_id: int) -> Roster:
        """
        Executes Google OR-Tools CP-SAT constraint optimization engine to generate
        the monthly roster with deterministic scheduling, distinct-employee coverage,
        and explicit shortage tracking.
        """
        roster = RosterService.get_by_id(db, roster_id)
        if roster.status == RosterStatus.PUBLISHED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot regenerate a published roster")

        from app.services.roster_generator import generate_monthly_roster as ortools_generate_monthly_roster
        ortools_generate_monthly_roster(
            month=roster.month,
            year=roster.year,
            preserve_locked_assignments=True,
            db=db,
            roster_id=roster.id
        )
        db.refresh(roster)
        return roster
        db.refresh(roster)
        return roster

    @staticmethod
    def validate_roster(db: Session, roster_id: int) -> Dict:
        roster = RosterService.get_by_id(db, roster_id)
        conflicts = ConflictService.detect_conflicts(db, roster_id)

        critical_count = sum(1 for c in conflicts if c.severity == "CRITICAL")
        warning_count = sum(1 for c in conflicts if c.severity == "WARNING")
        info_count = sum(1 for c in conflicts if c.severity == "INFO")

        if critical_count == 0:
            roster.status = RosterStatus.VALIDATED
            roster.validated_at = datetime.utcnow()
            db.commit()
            is_valid = True
            msg = "Roster successfully validated with zero critical conflicts."
        else:
            is_valid = False
            msg = f"Roster validation failed with {critical_count} critical conflicts requiring resolution."

        return {
            "roster_id": roster_id,
            "status": roster.status.value,
            "is_valid": is_valid,
            "message": msg,
            "total_conflicts": len(conflicts),
            "critical_conflicts": critical_count,
            "warning_conflicts": warning_count,
            "info_conflicts": info_count,
        }

    @staticmethod
    def publish_roster(db: Session, roster_id: int) -> Roster:
        roster = RosterService.get_by_id(db, roster_id)
        # Verify validation
        conflicts = ConflictService.detect_conflicts(db, roster_id)
        critical_count = sum(1 for c in conflicts if c.severity == "CRITICAL")
        if critical_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot publish roster with {critical_count} unresolved critical conflicts"
            )

        roster.status = RosterStatus.PUBLISHED
        roster.published_at = datetime.utcnow()
        db.commit()
        db.refresh(roster)
        return roster

    @staticmethod
    def create_new_version(db: Session, roster_id: int, notes: Optional[str] = None) -> Roster:
        parent = RosterService.get_by_id(db, roster_id)
        new_version = parent.version + 1

        new_roster = Roster(
            name=f"{parent.name} (v{new_version})",
            month=parent.month,
            year=parent.year,
            start_date=parent.start_date,
            end_date=parent.end_date,
            status=RosterStatus.DRAFT,
            version=new_version,
            parent_roster_id=parent.id,
            created_by=parent.created_by,
            notes=notes or f"Branch from v{parent.version}"
        )
        db.add(new_roster)
        db.commit()
        db.refresh(new_roster)

        # Clone assignments from parent
        parent_assignments = list(db.scalars(
            select(RosterAssignment).where(RosterAssignment.roster_id == parent.id)
        ).all())

        for pa in parent_assignments:
            ra = RosterAssignment(
                roster_id=new_roster.id,
                employee_id=pa.employee_id,
                date=pa.date,
                shift_id=pa.shift_id,
                is_off=pa.is_off,
                off_reason=pa.off_reason,
                is_locked=pa.is_locked,
                is_manual_override=pa.is_manual_override,
                notes=pa.notes
            )
            db.add(ra)
            db.flush()

            for pap in pa.processes:
                new_pap = RosterAssignmentProcess(
                    roster_assignment_id=ra.id,
                    brand_id=pap.brand_id,
                    process_id=pap.process_id,
                    allocated_hours=pap.allocated_hours,
                    is_primary=pap.is_primary
                )
                db.add(new_pap)

        db.commit()
        return new_roster

    @staticmethod
    def lock_assignment(db: Session, assignment_id: int, is_locked: bool) -> RosterAssignment:
        ra = db.get(RosterAssignment, assignment_id)
        if not ra:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"RosterAssignment {assignment_id} not found")
        ra.is_locked = is_locked
        db.commit()
        db.refresh(ra)
        return ra
