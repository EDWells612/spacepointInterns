import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    leader = "leader"
    intern = "intern"

class WorkStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

class SubmissionStatus(str, enum.Enum):
    submitted = "submitted"
    reviewed = "reviewed"
