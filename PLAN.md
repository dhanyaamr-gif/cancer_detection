# Comprehensive Fix Plan - NovaDx Platform

## Analysis Summary
The platform uses mock-data extensively across Dashboard, Patients, Analysis History, and Reports pages. The backend already has proper MongoDB models, controllers, and Socket.IO events. The frontend needs to be refactored to use real API data and properly handle empty/loading states.

## Files to Modify

### 1. Dashboard (`app/dashboard/page.tsx`)
**Issues:**
- FALLBACK_PREDICTION shows hardcoded risk data before any upload
- Hardcoded "Patient ID: P-2025-00124" and "Scan Type: Chest CT" in header
- Hardcoded AI Explanation cards (Tumor Boundary 92%, Tissue Contrast 89%, etc.)
- Hardcoded Tumor Details (2.31 cm, Right Upper Lobe, 0.94, High)
- Hardcoded Heatmap image
- Upload modal overflows viewport (no max-height/scroll)
- Notifications stack instead of replace
- Progress bar shows static "AI Analysis in Progress..." instead of sequential steps
- No loading states for each analysis phase
- Import from `@/lib/mock-data` (doctor)

**Fixes:**
- Remove FALLBACK_PREDICTION entirely
- Show placeholder states when no scan is selected: "No Analysis Yet", gray ring at 0%, "Awaiting Scan"
- Show "No tumor detected yet. Upload an MRI or CT scan to begin." in Tumor Details
- Show "No Heatmap Available" placeholder in heatmap card
- Show "Upload MRI/CT Scan" placeholder in main viewer
- Use real data from upload response + socket events
- Make Patient ID, Scan Type, and all cards reactive to state
- Add `max-height: 90vh`, `overflow-y: auto`, sticky footer to upload modal
- Replace toast stacking with single replaceable toast
- Add sequential progress: Uploading... → Analyzing AI... → Generating Heatmap... → Saving Database... → Updating UI... → Complete
- Remove `doctor` import from mock-data, use localStorage or API

### 2. Prediction Card (`components/cards/prediction-card.tsx`)
**Issues:**
- Always shows red gradient (hardcoded `#ff3b3b` title color)
- Always shows "(Cancer Detected)" subtitle
- Always shows red gradient ring

**Fixes:**
- Accept `cancerDetected` boolean prop
- If no analysis yet: show "No Analysis Yet" title, gray ring at 0%, "Awaiting Scan" subtitle
- Use dynamic colors based on cancerDetected and resultLabel
- Use dynamic status text

### 3. Image Viewer (`components/viewer/image-viewer.tsx`)
**Issues:**
- No placeholder state for empty images

**Fixes:**
- Show placeholder "Upload MRI/CT Scan" centered text when no images

### 4. Patients Page (`app/patients/page.tsx`)
**Issues:**
- Uses `@/lib/mock-data` for patients array
- Uses `patientDetails` hardcoded object
- No API fetching
- No socket event listeners for real-time updates

**Fixes:**
- Fetch patients from `patientsAPI.getAll()` on mount
- Replace hardcoded patientDetails with real scan data from backend
- Listen for `patients:update` and `dashboard:update` socket events
- Show loading/empty states
- Use API response data for scan/confidence/status

### 5. Analysis History Page (`app/analysis-history/page.tsx`)
**Issues:**
- Uses `@/lib/mock-data` for predictions array
- Uses `analysisDetails` hardcoded object
- No API fetching
- No socket event listeners

**Fixes:**
- Fetch history from `historyAPI.getAll()` on mount
- Replace hardcoded analysisDetails with real data from backend
- Listen for `history:update` socket events
- Show loading/empty states

### 6. Reports Page (`app/reports/page.tsx`)
**Issues:**
- Uses `@/lib/mock-data` for reports array
- Uses `reportDetails` hardcoded object
- No API fetching
- No socket event listeners

**Fixes:**
- Fetch reports from `reportsAPI.getAll()` on mount
- Replace hardcoded reportDetails with real data from backend
- Listen for `reports:update` socket events
- Show loading/empty states

### 7. Navbar (`components/navbar/navbar.tsx`)
**Issues:**
- Likely uses mock-data for notifications

**Fixes:**
- Use `notificationsAPI.getAll()` and socket events

### 8. Upload Modal Scrolling
**Fix in dashboard page.tsx:**
- Add `max-height: min(90vh, 800px)` to the modal wrapper
- Add `overflow-y: auto` with custom scrollbar styling
- Make buttons in footer sticky (position: sticky, bottom: 0)

### 9. Single Toast Notifications
**Issues:**
- Current `notify()` adds to array, allowing stacking
- No way to replace existing toast

**Fixes:**
- Use single toast state instead of array
- `notify()` replaces current toast, clears previous timer
- Sequential updates during upload

### 10. Sequential Progress
**Fix in handleUpload:**
- Show phases: Uploading... → Analyzing AI... → Generating Heatmaps... → Saving to Database... → Updating Dashboard... → Complete
- Each phase updates a single progress label

### 11. Remove all mock-data imports from pages
- `app/dashboard/page.tsx` - Remove `doctor` import from mock-data
- `app/patients/page.tsx` - Remove `patients` import from mock-data
- `app/analysis-history/page.tsx` - Remove `patients, predictions` imports from mock-data
- `app/reports/page.tsx` - Remove `patients, predictions, reports` imports from mock-data

### 12. Socket.IO cross-page sync
- All pages should listen for relevant socket events
- Dashboard: analysis:completed, dashboard:update
- Patients: patients:update, dashboard:update
- History: history:update
- Reports: reports:update
- Notifications: notification:new

## Implementation Order
1. Prediction card (empty state)
2. Image viewer (empty state)
3. Dashboard (all hardcoded values removed, placeholders, modal scroll, single toast, sequential progress)
4. Patients page (API + sockets)
5. Analysis History page (API + sockets)
6. Reports page (API + sockets)
7. Navbar (API + sockets)
8. Testing

