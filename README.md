# Pre-Litigation Task Manager

A TypeScript/Next.js application for managing and tracking pre-litigation tasks with dependencies, deployable on Vercel.

## Features

- **Default Task Workflow**: Automatically creates 5 default tasks for each legal matter
- **Dependency Management**: Supports both task completion and time-based dependencies
- **Task Execution**: Validates dependencies before allowing task execution
- **Custom Tasks**: Add new tasks to existing matters with custom dependencies
- **REST API**: Full API for programmatic access
- **Web Interface**: Clean UI for managing matters and tasks

## Default Tasks

1. **Intake Call** (no dependencies)
2. **Sign Engagement Letter** (depends on Intake Call)
3. **Collect Medical Records** (depends on Sign Engagement Letter)
4. **Client Check In** (depends on Sign Engagement Letter + 2 weeks after Intake Call)
5. **Create Demand** (depends on Collect Medical Records)

## API Endpoints

### Matters
- `GET /api/matters` - List all matters
- `POST /api/matters` - Create new matter
- `GET /api/matters/[id]` - Get matter status

### Tasks
- `POST /api/tasks/execute` - Execute a task
- `POST /api/tasks/create` - Create custom task
- `POST /api/tasks/add-dependency` - Add dependency to existing task

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Usage Examples

### Create a Matter
```bash
curl -X POST http://localhost:3000/api/matters \
  -H "Content-Type: application/json" \
  -d '{"matterId": "CASE_001", "clientName": "John Doe"}'
```

### Execute a Task
```bash
curl -X POST http://localhost:3000/api/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{"matterId": "CASE_001", "taskId": "intake_call"}'
```

### Create Custom Task
```bash
curl -X POST http://localhost:3000/api/tasks/create \
  -H "Content-Type: application/json" \
  -d '{
    "matterId": "CASE_001",
    "taskId": "file_lawsuit",
    "name": "File Lawsuit",
    "dependencies": [{
      "dependencyType": "task_completion",
      "targetTaskId": "create_demand"
    }]
  }'
```

## Data Persistence

Currently uses in-memory storage for demo purposes. For production, integrate with a database:

- PostgreSQL
- MongoDB
- Supabase
- PlanetScale

Update the `lib/storage.ts` file to connect to your database of choice.

## Environment Variables

For production deployment, you may want to add:

```env
DATABASE_URL=your_database_connection_string
```

## License

MIT
