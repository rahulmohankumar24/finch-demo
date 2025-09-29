from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from dataclasses import dataclass, field
from enum import Enum


class DependencyType(Enum):
    TASK_COMPLETION = "task_completion"
    TIME_BASED = "time_based"


@dataclass
class Dependency:
    """Represents a task dependency"""
    dependency_type: DependencyType
    target_task_id: str
    time_delay_weeks: Optional[int] = None  # For time-based dependencies

    def __post_init__(self):
        if self.dependency_type == DependencyType.TIME_BASED and self.time_delay_weeks is None:
            raise ValueError("Time-based dependencies must specify time_delay_weeks")


@dataclass
class Task:
    """Represents a task in the litigation process"""
    task_id: str
    name: str
    dependencies: List[Dependency] = field(default_factory=list)
    completed: bool = False
    completion_date: Optional[datetime] = None
    created_date: datetime = field(default_factory=datetime.now)

    def mark_complete(self):
        """Mark the task as complete"""
        self.completed = True
        self.completion_date = datetime.now()

    def add_dependency(self, dependency: Dependency):
        """Add a new dependency to this task"""
        self.dependencies.append(dependency)

    def check_dependencies_met(self, all_tasks: Dict[str, 'Task']) -> bool:
        """Check if all dependencies for this task are satisfied"""
        for dep in self.dependencies:
            if dep.dependency_type == DependencyType.TASK_COMPLETION:
                target_task = all_tasks.get(dep.target_task_id)
                if not target_task or not target_task.completed:
                    return False

            elif dep.dependency_type == DependencyType.TIME_BASED:
                target_task = all_tasks.get(dep.target_task_id)
                if not target_task or not target_task.completed:
                    return False

                required_date = target_task.completion_date + timedelta(weeks=dep.time_delay_weeks)
                if datetime.now() < required_date:
                    return False

        return True


class Matter:
    """Represents a legal matter with associated tasks"""

    def __init__(self, matter_id: str, client_name: str):
        self.matter_id = matter_id
        self.client_name = client_name
        self.tasks: Dict[str, Task] = {}
        self.created_date = datetime.now()
        self._create_default_tasks()

    def _create_default_tasks(self):
        """Create the default tasks for a new matter"""
        # 1. Intake call (no dependencies)
        intake_call = Task("intake_call", "Intake Call")

        # 2. Sign engagement letter (depends on intake call)
        sign_engagement = Task("sign_engagement", "Sign Engagement Letter")
        sign_engagement.add_dependency(
            Dependency(DependencyType.TASK_COMPLETION, "intake_call")
        )

        # 3. Collect medical records (depends on sign engagement letter)
        collect_records = Task("collect_medical_records", "Collect Medical Records")
        collect_records.add_dependency(
            Dependency(DependencyType.TASK_COMPLETION, "sign_engagement")
        )

        # 4. Client check in (sign engagement complete + 2 weeks since intake call)
        client_checkin = Task("client_checkin", "Client Check In")
        client_checkin.add_dependency(
            Dependency(DependencyType.TASK_COMPLETION, "sign_engagement")
        )
        client_checkin.add_dependency(
            Dependency(DependencyType.TIME_BASED, "intake_call", time_delay_weeks=2)
        )

        # 5. Create demand (depends on collect medical records)
        create_demand = Task("create_demand", "Create Demand")
        create_demand.add_dependency(
            Dependency(DependencyType.TASK_COMPLETION, "collect_medical_records")
        )

        # Add all tasks to the matter
        for task in [intake_call, sign_engagement, collect_records, client_checkin, create_demand]:
            self.tasks[task.task_id] = task

    def add_task(self, task_id: str, name: str, dependencies: List[Dependency] = None) -> Task:
        """Add a new task to the matter"""
        if task_id in self.tasks:
            raise ValueError(f"Task with ID '{task_id}' already exists")

        task = Task(task_id, name, dependencies or [])
        self.tasks[task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID"""
        return self.tasks.get(task_id)

    def execute_task(self, task_id: str) -> str:
        """Attempt to execute a task"""
        task = self.tasks.get(task_id)
        if not task:
            return f"Task {task_id} not found"

        if task.completed:
            return f"Task {task.name} already completed"

        if task.check_dependencies_met(self.tasks):
            task.mark_complete()
            return f"Task {task.name} complete"
        else:
            return f"Task {task.name} not ready"

    def add_dependency_to_task(self, task_id: str, dependency: Dependency):
        """Add a dependency to an existing task"""
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        task.add_dependency(dependency)

    def get_task_status(self) -> Dict[str, Dict]:
        """Get status of all tasks"""
        status = {}
        for task_id, task in self.tasks.items():
            dependencies_met = task.check_dependencies_met(self.tasks)
            status[task_id] = {
                "name": task.name,
                "completed": task.completed,
                "completion_date": task.completion_date,
                "dependencies_met": dependencies_met,
                "can_execute": not task.completed and dependencies_met
            }
        return status


class LitigationTaskManager:
    """Main API for managing litigation matters and tasks"""

    def __init__(self):
        self.matters: Dict[str, Matter] = {}

    def create_matter(self, matter_id: str, client_name: str) -> Matter:
        """Create a new legal matter with default tasks"""
        if matter_id in self.matters:
            raise ValueError(f"Matter with ID '{matter_id}' already exists")

        matter = Matter(matter_id, client_name)
        self.matters[matter_id] = matter
        return matter

    def get_matter(self, matter_id: str) -> Optional[Matter]:
        """Get a matter by ID"""
        return self.matters.get(matter_id)

    def trigger_task(self, matter_id: str, task_id: str) -> str:
        """Trigger execution of a task"""
        matter = self.matters.get(matter_id)
        if not matter:
            return f"Matter {matter_id} not found"

        return matter.execute_task(task_id)

    def create_task(self, matter_id: str, task_id: str, name: str, dependencies: List[Dependency] = None) -> str:
        """Create a new task in a matter"""
        matter = self.matters.get(matter_id)
        if not matter:
            return f"Matter {matter_id} not found"

        try:
            matter.add_task(task_id, name, dependencies)
            return f"Task {name} created successfully"
        except ValueError as e:
            return str(e)

    def add_dependency(self, matter_id: str, task_id: str, dependency: Dependency) -> str:
        """Add a dependency to an existing task"""
        matter = self.matters.get(matter_id)
        if not matter:
            return f"Matter {matter_id} not found"

        try:
            matter.add_dependency_to_task(task_id, dependency)
            return f"Dependency added to task {task_id}"
        except ValueError as e:
            return str(e)

    def get_matter_status(self, matter_id: str) -> Optional[Dict]:
        """Get complete status of a matter and its tasks"""
        matter = self.matters.get(matter_id)
        if not matter:
            return None

        return {
            "matter_id": matter.matter_id,
            "client_name": matter.client_name,
            "created_date": matter.created_date,
            "tasks": matter.get_task_status()
        }

    def list_matters(self) -> List[Dict]:
        """List all matters"""
        return [
            {
                "matter_id": matter.matter_id,
                "client_name": matter.client_name,
                "created_date": matter.created_date,
                "total_tasks": len(matter.tasks),
                "completed_tasks": sum(1 for task in matter.tasks.values() if task.completed)
            }
            for matter in self.matters.values()
        ]