# SpacePoint Interns — Backend

FastAPI REST API with async SQLAlchemy and PostgreSQL.

## Requirements

- Python 3.11+
- PostgreSQL database (Supabase recommended)

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Fill in the values (see Environment Variables below)

# 4. Run database migrations (raw SQL)
# Run the scripts in /sql against your database in order

# 5. Start the server
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
SECRET_KEY=your-jwt-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Project Structure

```
app/
├── main.py          # App entry point, CORS, router registration
├── core/            # Config, security (JWT, hashing)
├── db/              # Database session setup
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic request/response schemas
├── routers/         # Route handlers (admin, leader, intern, auth)
└── services/        # Business logic layer
```

## API Routes

| Prefix | Role | Description |
|--------|------|-------------|
| `/auth` | Public | Login, token refresh |
| `/admin` | Admin | Users, teams, projects, tasks |
| `/leader` | Leader | Team tasks, subtasks, submission review |
| `/intern` | Intern | Assigned subtasks, submit work |
| `/profile` | All | Current user profile |
| `/notifications` | All | Notifications |

## Notes

- All primary keys are UUIDs
- Passwords are hashed with bcrypt
- JWT access tokens are short-lived; refresh tokens are long-lived and rotated on use
- Alembic is set up but not yet in active use — schema changes are currently applied via raw SQL
