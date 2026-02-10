# Future Features & Enhancements

Ideas and features to implement in future versions of Kong.

## Data Import/Export

### CSV Import ⭐ High Priority
- **Assets**: Bulk import assets from CSV
  - Columns: name, asset_type, description, status
  - Auto-create missing asset types
  - Validation and error reporting
  - Preview before import

- **Shots**: Bulk import shots from CSV
  - Columns: sequence_code, shot_code, cut_in, cut_out, description
  - Auto-create missing sequences
  - Frame range validation

- **Tasks**: Bulk import tasks from CSV
  - Columns: entity_type, entity_code, step, assignee, due_date
  - Link to existing entities
  - Auto-assign users

### Excel/Spreadsheet Import
- Support .xlsx files
- Multiple sheets (one per entity type)
- Template generation

### Export Functionality
- Export to CSV/Excel
- Export filtered/selected items
- Include related data (tasks for shots, etc.)

## Pipeline Enhancements

### Pipeline Status Visualization
- Color-coded status columns (like ShotGrid)
- One column per pipeline step
- Click to change status
- Progress indicators

### Custom Pipeline Steps
- User-defined pipeline steps
- Per-project pipeline configuration
- Step dependencies
- Conditional steps

## Collaboration Features

### Real-time Updates
- Live updates when others make changes
- User presence indicators
- Collaborative editing

### @Mentions & Notifications
- Mention users in notes
- Email notifications
- In-app notification center
- Notification preferences

## Media & Review

### Thumbnail Upload
- Drag-and-drop upload
- Auto-generate thumbnails
- Image cropping
- Multiple formats support

### Video Review
- Video upload for versions
- Frame-accurate playback
- Drawing tools for annotations
- Compare mode (side-by-side)

## Reporting & Analytics

### Dashboard Widgets
- Task completion charts
- Shot progress by sequence
- Artist workload
- Project timeline

### Custom Reports
- Report builder
- Saved report templates
- PDF export
- Scheduled reports

## Integrations

### Maya Integration
- Submit versions from Maya
- Link to published files
- Scene file management

### Nuke Integration
- Submit comp versions
- Read plate and render info
- Auto-update file paths

### Deadline Integration
- Render farm status
- Job submission
- Priority management

## Advanced Features

### Version Control
- File versioning
- Published file tracking
- Dependency management
- Rollback capability

### Time Tracking
- Log time per task
- Timesheet view
- Billable hours
- Time reports

### Resource Planning
- User scheduling
- Capacity planning
- Gantt chart for people
- Vacation/PTO management

### Permissions & Security
- Fine-grained permissions
- Department-based access
- Role-based access control (RBAC)
- Audit logs

## UI/UX Improvements

### Keyboard Shortcuts
- Quick actions
- Navigation shortcuts
- Customizable bindings

### Dark/Light Theme
- Theme switcher
- Per-user preference
- Custom color schemes

### Mobile App
- iOS/Android apps
- Review on mobile
- Approve versions
- Task updates

### Offline Mode
- Work offline
- Sync when online
- Cached data

## Performance

### Caching
- Redis caching
- Client-side caching
- Image CDN

### Search
- Full-text search
- Advanced filters
- Saved searches
- Search across all entities

### Pagination
- Virtual scrolling
- Infinite scroll
- Load more

## Documentation

### User Guide
- Getting started
- Video tutorials
- Tips & tricks

### API Documentation
- REST API endpoints
- GraphQL API
- SDK for integrations

---

**Note**: Features are not in priority order within sections. CSV Import is marked as high priority based on user request.

**Updated**: 2026-02-05
