# Kong UI Architecture - ShotGrid Pattern

Based on actual ShotGrid UI screenshots and patterns.

## Layout Structure

### Global Navigation (Top Bar)
```
[Kong Logo] Inbox | My Tasks | Media | Projects ▼ | All Pages ▼ | People | Apps ▼ | Resource Planning
                                                                    [Search] [Notifications] [User] [+]
```

### Project Navigation (Horizontal Tabs)
```
[Project Name: RND]

Project Details | Assets | Sequences | Shots | Tasks | Notes | Versions | Playlists | Other ▼ | Project Pages ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key Points:**
- Horizontal tabs, NOT sidebar
- Each tab = entity type page
- Tabs stay fixed while scrolling
- Active tab highlighted

---

## Page Layouts

### 1. Overview (Project Details) - Widget Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Project Thumbnail    │  Sequences Widget                         │
│ Upload Image         │  ┌────────────────────────────────┐      │
│                      │  │ Sequence Name │ Status │ Desc  │      │
│ -2026 days until     │  │ BAE          │   ✓    │       │      │
│ Deadline             │  │ BCD          │   ✓    │       │      │
│                      │  │ CBG          │   ✓    │       │      │
│                      │  └────────────────────────────────┘      │
├──────────────────────┴───────────────────────────────────────────┤
│ Shot Status Widget          │ % Final by Department Widget       │
│ (Chart - empty)             │ (Chart - empty)                    │
├─────────────────────────────┼────────────────────────────────────┤
│ Asset Status Widget         │ Project Crew Widget                │
│ (Chart - empty)             │ [Avatar] Name      Email           │
│                             │ [Avatar] Name      Email           │
│                             │ [Avatar] Name      Email           │
├─────────────────────────────┴────────────────────────────────────┤
│ Open Notes Widget                                                │
│ Subject │ Body │ Status                                          │
│ (empty)                                                          │
├──────────────────────────────────────────────────────────────────┤
│ Latest Versions Widget                                           │
│ [thumb] [thumb] [thumb] [thumb] [thumb] [thumb]                 │
│ v001    v002    v001    v002    v001    v001                    │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**
- Multiple collapsible widgets
- Each widget has expand/collapse
- Each widget has refresh/settings icons
- Drag-and-drop to rearrange

---

### 2. Assets Page - Table View with Pipeline

```
Assets ⭐

┌─ Toolbar ─────────────────────────────────────────────────┐
│ [Grid][List][Timeline] [Add Asset ▼] Sort ▼ Group ▼ Fields ▼ More ▼ Pipeline ▼    [Filter] [Search Assets...]
└───────────────────────────────────────────────────────────┘

┌─ Table ───────────────────────────────────────────────────────────────────────────────────────┐
│ Thumbnail│ Asset Name │ Type        │ Description │ Status │ [Pipeline Status Columns...] │ Shots │
├──────────┼────────────┼─────────────┼─────────────┼────────┼──────────────────────────────┼───────┤
│ ▼ Template (1)                                                                                  │
│ [Upload] │ prop       │ Template    │ test        │    -   │ [red][purple][yellow][...]   │       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

Pipeline Status Columns:
[finaling] [model] [lighting] [anim] [cfx] [Shots]
Status     Status  Status     Status  Status

Each column:
- Colored vertical bar (red/purple/yellow/green/cyan/orange)
- Shows task status for that step
- Click to change status
- Empty = not started
```

**Key Features:**
- **Type column** (not separate nav) - character, prop, environment, vehicle, fx, matte_painting
- **Pipeline columns** - one per step, color-coded
- **Grouping** - can group by Type, Status, etc.
- **Inline thumbnails** - small previews in table
- **Shots column** - shows which shots use this asset

---

### 3. Sequences Page - Table View

```
Sequences ⭐

[Grid][List][Timeline] [Add Sequence ▼] Sort ▼ Group ▼ Fields ▼ More ▼ Pipeline ▼    [Filter] [Search Sequences...]

┌─ Table ────────────────────────────────────────────────────────────────────────┐
│ Sequence Name │ Thumbnail │ Status │ Description │ Shots                        │
├───────────────┼───────────┼────────┼─────────────┼──────────────────────────────┤
│ RTV           │ [Upload]  │   ✓    │             │ [2561]                       │
│ KED           │ [Upload]  │   ✓    │             │ [0092] [1210]                │
│ BAE           │ [Upload]  │   ✓    │             │ [0010] [0420] [0]            │
│ EPB           │ [Upload]  │   ✓    │             │ [0050] [2270] -              │
│ FSH           │ [Upload]  │   ✓    │             │ [0400] - [0405] -            │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Shots column** - shows shot numbers as clickable badges
- **Inline shot links** - click to jump to shot
- **Status checkmarks** - simple on/off
- **No grouping** - flat list (but can group if needed)

---

### 4. Shots Page - Grouped Table with Pipeline

```
Shots ⭐

[Grid][List][Timeline] [Add Shot ▼] Sort ▼ Group ▼ Fields ▼ More ▼ Pipeline ▼    [Filter] [Search Shots...]

┌─ Table (Grouped by Sequence) ─────────────────────────────────────────────────────────────────────────────────┐
│Thumb│Sequence│Shot Code│Type│Desc│Status│[editorial][previz][library][kinvfx][rend][cfx][prod][fmat][roto]│Cut In│Out│Duration│Assets│
├─────┼────────┼─────────┼────┼────┼──────┼────────────────────────────────────────────────────────────────────┼──────┼───┼────────┼──────┤
│ ▼ BAE (29)                                                                                                              │
│ [thu]│ BAE    │ 0010    │ VFX│    │  ●   │ [red][purple][purple][green][cyan][prod][orange][roto]             │      │   │        │      │
│ [thu]│ BAE    │ 0300    │ VFX│    │  ●   │ [red][purple][purple][green][cyan][prod][orange][roto]             │      │   │        │      │
│ [thu]│ BAE    │ 0420    │ VFX│    │  ●   │ [red][purple][purple][green][cyan][prod][orange][roto]             │      │   │        │      │
│ [thu]│ BAE    │ 0520    │ VFX│    │  ★   │ [red][purple][purple][green][cyan][prod][orange][roto]             │      │   │        │      │
│ ▼ BFD (3)                                                                                                               │
│ [thu]│ BFD    │ 2620    │ VFX│    │  ●   │ [...pipeline columns...]                                           │      │   │        │      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Grouped by Sequence** - collapsible groups
- **Pipeline status columns** - 9+ colored columns showing task status
- **Thumbnails** - inline video/image previews
- **Stars** - favorite/bookmark shots
- **Cut info** - Cut In, Cut Out, Duration (editorial info)
- **Type column** - VFX, CG, Plate, etc.

---

### 5. Tasks Page - Split View (Table + Gantt)

```
Tasks ⭐

[Grid][List][Timeline] [Add Task ▼] Sort ▼ Group ▼ Fields ▼ More ▼        Gantt Display ▼  [Today]    [Filter] [Search Tasks...]

┌─ Table (Left 60%) ─────────────────────────────────────┬─ Gantt Chart (Right 40%) ──────────────────┐
│ Task Name          │Link│Step      │Desc│Status│%│Assign│ September 2025                              │
├────────────────────┼────┼──────────┼────┼──────┼─┼──────┼───────┬───────┬───────┬───────┬───────────┤
│ ▼ prop (1)                                              │  12   │  19   │  26   │   3   │   10       │
│   ○ model          │0000│Modeling  │    │  -   │0%│     │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │
│ ▼ 0010 (3)                                              │       │       │       │       │            │
│   ○ Vendor         │0010│Vendor    │    │  ★   │0%│     │       ░░░░░░░░░░░░                        │
│   ○ integ_mp01_kam │0010│Roto      │Track│  ×  │0%│     │       ░░░░░░░░░░░░░░░░                    │
│   ○ integ_mp01_roth│0010│Integration│Track│ × │0%│     │       ░░░░░░░░░░░░░░░░░░░░                │
│ ▼ 0400 (1)                                              │       │       │       │       │            │
│   ○ Vendor         │0400│Vendor    │    │  -   │0%│     │       │       │       │       │            │
│ ▼ 0420 (2)                                              │       │       │       │       │            │
│   ○ Vendor         │0420│Vendor    │    │  ★   │0%│     │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│   ○ integ_mp01_cam │0420│Integration│Track│  ×  │0%│     │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└────────────────────┴────┴──────────┴────┴──────┴─┴──────┴─────────────────────────────────────────────┘
```

**Key Features:**
- **Split view** - table on left, Gantt on right
- **Grouped by entity** - shots/assets are parent groups
- **Hierarchical tree** - expand/collapse groups
- **Pipeline step badges** - colored labels (Modeling, Vendor, Roto, Integration)
- **Status icons** - star (favorite), × (in progress), - (not started)
- **Progress %** - 0%, 50%, 100%
- **Gantt bars** - color-coded by step, shows duration
- **Date range selector** - drag to zoom timeline
- **"Today" marker** - vertical line showing current date

---

## Component Architecture

### 1. Project Layout Component
```typescript
<ProjectLayout projectId={projectId}>
  <ProjectTabs active="shots" />
  <PageContent>
    {children} // Assets, Shots, Tasks, etc.
  </PageContent>
</ProjectLayout>
```

### 2. Entity Table Component
```typescript
<EntityTable
  entityType="shots"
  columns={[
    { id: 'thumbnail', type: 'thumbnail' },
    { id: 'sequence', type: 'link' },
    { id: 'code', type: 'text' },
    { id: 'type', type: 'select' },
    { id: 'status', type: 'status' },
    ...pipelineColumns, // Dynamic based on steps
    { id: 'cut_in', type: 'number' },
    { id: 'assets', type: 'links' },
  ]}
  groupBy="sequence"
  toolbar={{
    showAdd: true,
    showSort: true,
    showGroup: true,
    showFilter: true,
    showPipeline: true,
  }}
/>
```

### 3. Pipeline Status Column Component
```typescript
<PipelineColumns
  steps={steps} // From steps table
  entity={shot}
  onStatusChange={(stepId, newStatus) => updateTaskStatus()}
/>

// Renders:
// [editorial] [previz] [library] [kinvfx] [rend] [cfx]
// Each column:
// - Color from step.color
// - Status from tasks WHERE shot_id AND step_id
// - Click to open status dropdown
```

### 4. Dashboard Widget Component
```typescript
<DashboardWidget
  title="Sequences"
  collapsible={true}
  actions={['refresh', 'settings']}
>
  <SequencesList limit={10} />
</DashboardWidget>
```

---

## File Structure (Updated)

```
src/
├── app/
│   ├── (global)/
│   │   ├── layout.tsx              # Global nav bar
│   │   ├── inbox/page.tsx
│   │   ├── my-tasks/page.tsx
│   │   └── projects/page.tsx        # Projects list
│   │
│   └── (project)/
│       ├── [projectId]/
│       │   ├── layout.tsx           # Project tabs
│       │   ├── overview/page.tsx    # Widget dashboard
│       │   ├── assets/page.tsx      # Assets table
│       │   ├── sequences/page.tsx   # Sequences table
│       │   ├── shots/page.tsx       # Shots table
│       │   ├── tasks/page.tsx       # Tasks table + Gantt
│       │   ├── notes/page.tsx
│       │   ├── versions/page.tsx
│       │   └── playlists/page.tsx
│       │
├── components/
│   ├── layout/
│   │   ├── global-nav.tsx           # Top nav bar
│   │   ├── project-tabs.tsx         # Horizontal tabs
│   │   └── page-header.tsx          # Page title + star
│   │
│   ├── table/
│   │   ├── entity-table.tsx         # Main table component
│   │   ├── table-toolbar.tsx        # Add, Sort, Group, etc.
│   │   ├── table-row.tsx            # Single row
│   │   ├── table-group.tsx          # Collapsible group
│   │   └── pipeline-columns.tsx     # Status columns
│   │
│   ├── dashboard/
│   │   ├── dashboard-widget.tsx     # Widget wrapper
│   │   ├── sequences-widget.tsx
│   │   ├── status-chart-widget.tsx
│   │   ├── crew-widget.tsx
│   │   └── versions-widget.tsx
│   │
│   ├── gantt/
│   │   ├── gantt-chart.tsx          # Timeline view
│   │   ├── gantt-row.tsx            # Task bar
│   │   └── gantt-header.tsx         # Date range
│   │
│   └── ui/
│       ├── status-badge.tsx         # Colored status
│       ├── pipeline-status.tsx      # Single status cell
│       └── thumbnail.tsx            # Image/video thumb
│
└── lib/
    ├── table-state.ts               # Table config state
    └── pipeline-colors.ts           # Step color mapping
```

---

## Key Differences from Current Design

| Feature | Current (Wrong) | ShotGrid (Correct) |
|---------|----------------|-------------------|
| **Navigation** | Sidebar | Horizontal tabs |
| **Layout** | Separate pages | Table views |
| **Asset Types** | Separate nav items | Column filter |
| **Sequences** | Separate page | Grouping in Shots table |
| **Pipeline** | Hidden in task details | Visible columns in table |
| **Tasks** | Simple list | Table + Gantt split view |
| **Overview** | Landing page | Widget dashboard |
| **Grouping** | None | Hierarchical tree |
| **Status** | Simple text | Color-coded bars |
| **Actions** | Buttons in cards | Toolbar + inline edit |

---

## Implementation Priority

### Phase 1: Core Layout (Week 2)
1. Replace sidebar with horizontal project tabs
2. Create EntityTable component
3. Add table toolbar (Add, Sort, Group, Fields)
4. Implement search and filter

### Phase 2: Pipeline Visualization (Week 3)
1. Pipeline status columns
2. Color-coded status bars
3. Click-to-update status
4. Step configuration

### Phase 3: Grouping & Hierarchy (Week 4)
1. Group by (Sequence, Type, Status, etc.)
2. Collapsible groups
3. Nested tables
4. Drag-and-drop reordering

### Phase 4: Gantt View (Week 5)
1. Split view (table + Gantt)
2. Timeline rendering
3. Task bars with colors
4. Date range selector

### Phase 5: Dashboard Widgets (Week 6)
1. Widget framework
2. Sequences widget
3. Status charts
4. Latest versions grid
5. Drag-and-drop widget layout

---

## Technology Stack

**Table Component:**
- TanStack Table (formerly React Table)
- Virtualization for large datasets
- Column resizing, sorting, filtering

**Gantt Chart:**
- Custom canvas rendering
- Or: react-gantt-chart
- Or: dhtmlx-gantt (commercial)

**Drag & Drop:**
- @hello-pangea/dnd (formerly react-beautiful-dnd)
- For grouping, widgets, Gantt rows

**Charts:**
- Recharts or Chart.js
- For status pie/bar charts in widgets

---

This architecture matches ShotGrid's actual UI patterns and will provide a familiar experience for production users.
