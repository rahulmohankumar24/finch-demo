#!/usr/bin/env python3

from litigation_system import LitigationTaskManager, Dependency, DependencyType
import time


def main():
    """Demo of the litigation task management system"""

    # Initialize the system
    manager = LitigationTaskManager()

    print("=== Pre-Litigation Task Management System Demo ===\n")

    # Create a new matter
    print("1. Creating a new matter...")
    matter = manager.create_matter("MATTER_001", "John Doe")
    print(f"Created matter: {matter.matter_id} for client: {matter.client_name}\n")

    # Show initial task status
    print("2. Initial task status:")
    status = manager.get_matter_status("MATTER_001")
    for task_id, task_info in status["tasks"].items():
        print(f"   {task_info['name']}: {'✓' if task_info['completed'] else '○'} "
              f"(Can execute: {task_info['can_execute']})")
    print()

    # Try to execute tasks in order
    print("3. Executing tasks...")

    # Execute intake call (should work)
    result = manager.trigger_task("MATTER_001", "intake_call")
    print(f"   Intake Call: {result}")

    # Try to execute sign engagement (should work now)
    result = manager.trigger_task("MATTER_001", "sign_engagement")
    print(f"   Sign Engagement: {result}")

    # Try to execute client checkin (should fail - need 2 weeks)
    result = manager.trigger_task("MATTER_001", "client_checkin")
    print(f"   Client Check In: {result}")

    # Execute collect medical records (should work)
    result = manager.trigger_task("MATTER_001", "collect_medical_records")
    print(f"   Collect Medical Records: {result}")

    # Execute create demand (should work)
    result = manager.trigger_task("MATTER_001", "create_demand")
    print(f"   Create Demand: {result}")
    print()

    # Add a new custom task
    print("4. Adding a custom task...")
    new_deps = [Dependency(DependencyType.TASK_COMPLETION, "create_demand")]
    result = manager.create_task("MATTER_001", "file_lawsuit", "File Lawsuit", new_deps)
    print(f"   {result}")

    # Execute the new task
    result = manager.trigger_task("MATTER_001", "file_lawsuit")
    print(f"   File Lawsuit: {result}")
    print()

    # Add dependency to existing task (make sign_engagement depend on the new task)
    print("5. Adding dependency to existing task...")
    new_dep = Dependency(DependencyType.TASK_COMPLETION, "file_lawsuit")
    result = manager.add_dependency("MATTER_001", "sign_engagement", new_dep)
    print(f"   {result}")
    print()

    # Show final status
    print("6. Final task status:")
    status = manager.get_matter_status("MATTER_001")
    for task_id, task_info in status["tasks"].items():
        completion_marker = "✓" if task_info['completed'] else "○"
        deps_met = "✓" if task_info['dependencies_met'] else "✗"
        print(f"   {task_info['name']}: {completion_marker} "
              f"(Dependencies met: {deps_met}, Can execute: {task_info['can_execute']})")
    print()

    # List all matters
    print("7. All matters in system:")
    matters = manager.list_matters()
    for matter_info in matters:
        print(f"   {matter_info['matter_id']}: {matter_info['client_name']} "
              f"({matter_info['completed_tasks']}/{matter_info['total_tasks']} tasks completed)")
    print()

    # Demo time-based dependency with a shorter wait
    print("8. Demonstrating time-based dependencies...")
    print("   (In real usage, client_checkin would need 2 weeks after intake_call)")
    print("   Current time-based dependency status:")
    matter_obj = manager.get_matter("MATTER_001")
    client_checkin_task = matter_obj.get_task("client_checkin")
    deps_met = client_checkin_task.check_dependencies_met(matter_obj.tasks)
    print(f"   Client Check In dependencies met: {deps_met}")


if __name__ == "__main__":
    main()