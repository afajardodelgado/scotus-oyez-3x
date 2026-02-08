# SCOTUS Case Tracker: Development Roadmap

## Overview

An iOS app tracking Supreme Court decisions, voting patterns, oral arguments, and calendars using publicly available APIs. **Development timeline: 12-16 weeks from setup to App Store publication.**

**Total Investment:**
- $99/year Apple Developer Program
- Development time (solo developer with AI assistance)
- No licensing fees for data sources

---

## Data Sources & APIs

### Primary Data Sources

| Data Type | Source | Format | Access Method | Rate Limits |
|-----------|--------|--------|---------------|-------------|
| Case opinions | CourtListener API | JSON + PDF links | REST API with token auth | 5,000 requests/day (free) |
| Oral argument audio | Oyez | MP3/streaming | Public API, no auth | No published limits |
| Voting records | SCDB (Penn State) | CSV download | Direct download | Annual updates |
| Court calendar | supremecourt.gov | PDF | Web scraping required | N/A |
| Real-time updates | CourtListener webhooks | JSON | WebSocket/webhook | TBD |

### CourtListener API (Primary Backend)

**Authentication:** Free account token via `Authorization: Token <your-token>` header

**Key Endpoints:**
- `/api/rest/v4/search/` - Universal search
- `/api/rest/v4/clusters/` - Opinion clusters
- `/api/rest/v4/audio/` - Oral arguments

**Documentation:** courtlistener.com/help/api/

### Oyez API (Oral Arguments)

**Base URL:** `api.oyez.org`

**Key Endpoints:**
- `https://api.oyez.org/cases?per_page=0` - All case summaries
- `https://api.oyez.org/cases/{term}/{docket_number}` - Individual case
- Audio files hosted on Amazon S3 (MP3 + streaming)

**GitHub Mirror:** `walkerdb/supreme_court_transcripts` (weekly automated updates)

### Supreme Court Database (SCDB)

**Download:** scdb.la.psu.edu

**Data Type:** Justice-centered CSV files with 200+ variables per case (1946-present)

**Update Frequency:** Annual (typically September)

**Use Case:** Voting pattern analysis, justice alignment calculations, ideological trends

### Calendar Data

**Source:** supremecourt.gov (PDF scraping)

**URLs Pattern:** `/oral_arguments/2024TermCourtCalendar.pdf`

**Challenge:** No structured API - requires PDF parsing or manual entry

---

## Technical Stack (iOS Native - SwiftUI)

### Core Framework
- **SwiftUI** (iOS 16.0+)
- **Swift 6.0+**
- **Xcode 15+**

### Key Libraries & Frameworks

| Feature | Library/Framework | Rationale |
|---------|------------------|-----------|
| Networking | URLSession + Async/Await | Native, no dependencies |
| JSON Parsing | Codable | Native Swift |
| PDF Viewing | PDFKit | Native, zero-config |
| Audio Playback | AVFoundation | Background playback, lock screen controls |
| Data Visualization | Swift Charts | Native iOS 16+, modern declarative syntax |
| Local Database | SwiftData | Modern replacement for Core Data (iOS 17+) |
| File Caching | FileManager | Native file system access |

### Data Models (Swift)

```swift
// Core Models
struct Case: Identifiable, Codable {
    let id: String
    let docketNumber: String
    let term: Int
    let caseName: String
    let decisionDate: Date?
    let voteBreakdown: VoteCount
    let opinionURL: URL?
    let oralArgumentAudioURL: URL?
}

struct VoteCount: Codable {
    let majority: Int
    let dissent: Int
    let type: DecisionType // unanimous, split, etc.
}

struct JusticeVote: Identifiable, Codable {
    let id: UUID
    let caseId: String
    let term: Int
    let justiceId: String
    let vote: VoteType // majority, dissent, concur
    let issueArea: String
}

enum VoteType: String, Codable {
    case majority
    case dissent
    case concur
}
```

### Architecture Pattern

**MVVM (Model-View-ViewModel)**
- Models: SwiftData entities for local persistence
- Views: SwiftUI views (screens, components)
- ViewModels: `@Observable` classes for business logic

---

## Feature Implementation Guide

### 1. Case Browsing & Detail View

**Components:**
- `CaseListView` - SwiftUI List with custom row styling
- `CaseDetailView` - ScrollView with metadata and actions
- `CaseService` - API integration for CourtListener

**Key Features:**
- Filter by term, justice, vote split
- Local caching with SwiftData
- Pull-to-refresh for new cases
- Deep linking to individual cases

### 2. PDF Opinion Viewer

**Implementation:** PDFKit (native)

```swift
import PDFKit

struct PDFViewerView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = PDFDocument(url: url)
        pdfView.autoScales = true
        return pdfView
    }
}
```

**Features:**
- Remote URL loading with caching
- Page navigation and search
- Zoom and scroll (native)
- Offline access (download and cache PDFs)

### 3. Oral Argument Audio Player

**Implementation:** AVFoundation with background playback

```swift
import AVFoundation

class AudioPlayerManager: NSObject, ObservableObject {
    private var player: AVPlayer?

    func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio)
        try? session.setActive(true)
    }

    func setupRemoteControls() {
        // Lock screen controls
        UIApplication.shared.beginReceivingRemoteControlEvents()
    }
}
```

**Features:**
- Background playback
- Lock screen controls (Now Playing Info Center)
- Playback speed: 1x, 1.25x, 1.5x, 2x
- 15/30-second skip buttons
- Progress tracking with timestamps

### 4. Voting Pattern Dashboard

**Implementation:** Swift Charts (iOS 16+)

**Visualizations:**
1. **Justice Alignment Heatmap** - Pairwise agreement percentages
2. **Vote Split Distribution** - 9-0 vs 5-4 decisions by term
3. **In-Majority Percentage Bars** - How often each justice joins winning side

```swift
import Charts

struct VotingDashboardView: View {
    @State private var alignmentData: [JusticePair] = []

    var body: some View {
        Chart(alignmentData) { pair in
            BarMark(
                x: .value("Justice", pair.justice1),
                y: .value("Agreement", pair.agreementPercentage)
            )
        }
    }
}
```

**Data Processing:**
- Pre-calculate aggregations when importing SCDB CSV
- Store in SwiftData for quick retrieval
- Filter by term, issue area

### 5. Calendar Integration

**Implementation:** EventKit

```swift
import EventKit

class CalendarService {
    let store = EKEventStore()

    func requestAccess() async -> Bool {
        try? await store.requestAccess(to: .event)
    }

    func addArgumentDate(case: Case, date: Date) {
        let event = EKEvent(eventStore: store)
        event.title = case.caseName
        event.startDate = date
        event.endDate = date.addingTimeInterval(3600) // 1 hour
        // Add to calendar...
    }
}
```

**Features:**
- One-tap "Add to Calendar" on case detail
- Pre-populated with case name, date, deep link

### 6. Search & Filtering

**Implementation:** SwiftData queries + full-text search

```swift
@Query(
    filter: #Predicate<Case> { case in
        case.caseName.localizedStandardContains(searchText)
    },
    sort: \Case.decisionDate,
    order: .reverse
) var cases: [Case]
```

**Search Scope:**
- Case names
- Docket numbers
- Justice names
- Issue areas

### 7. Push Notifications (Post-Launch)

**Implementation:** Firebase Cloud Messaging + APNs

**Notification Triggers:**
- New opinion releases (poll CourtListener)
- Order list publications (Monday mornings)
- Upcoming arguments for bookmarked cases

**Requirements:**
- Backend service (Firebase Functions or similar)
- Device token management
- User notification preferences

---

## 16-Week Development Timeline

### Weeks 1-2: Foundation
- ✓ Enroll in Apple Developer Program ($99)
- ✓ Set up Xcode project (SwiftUI, iOS 16.0+ target)
- ✓ Configure design system (colors, fonts, tokens)
- ✓ Download SCDB CSV files
- ✓ Design SwiftData schema
- ✓ Build CSV import script for SCDB data

**Deliverable:** Empty app with design system + local SCDB database

### Weeks 3-5: Core Data Layer & Case Browsing
- Implement CourtListener API service layer
- Build `CaseListView` with SwiftUI List
- Create `CaseDetailView` with metadata
- Implement local caching (SwiftData)
- Add pull-to-refresh
- Basic filtering (by term)

**Deliverable:** Functional case browser (no PDF/audio yet)

### Weeks 6-8: PDF & Audio Features
- Integrate PDFKit for opinion viewing
- Implement PDF download and caching
- Build audio player UI (AVFoundation)
- Configure background playback
- Add lock screen controls
- Implement playback speed controls
- Connect to Oyez API for audio URLs

**Deliverable:** Full case detail experience with PDF and audio

### Weeks 9-10: Voting Dashboard
- Build justice alignment calculation logic
- Implement Swift Charts visualizations
- Create filters (term, issue area)
- Add detail drill-downs (tap justice to see cases)

**Deliverable:** Complete voting pattern analytics dashboard

### Weeks 11-12: Polish & Supplementary Features
- Implement search (SwiftData queries)
- Add case bookmarking
- Build calendar integration (EventKit)
- Create settings screen
- VoiceOver accessibility
- Dynamic Type support
- Edge case handling and error states

**Deliverable:** Feature-complete app

### Weeks 13-14: Testing & Beta
- Internal testing (multiple device sizes)
- Upload to TestFlight (internal testers)
- Fix critical bugs
- External TestFlight beta (optional)
- Create App Store assets:
  - Screenshots (1320 x 2868px for iPhone 16 Pro Max)
  - App icon (1024 x 1024px PNG)
  - App preview video (optional)
  - Metadata (description, keywords)

**Deliverable:** Beta-tested, stable build

### Weeks 15-16: Submission & Launch
- Complete App Store Connect listing
- Write privacy policy (host online)
- Configure App Privacy labels
- Submit for App Review
- Respond to feedback (if rejected)
- Plan launch timing

**Deliverable:** Live on App Store

---

## App Store Requirements

### Apple Developer Program
- **Cost:** $99/year
- **Approval Time:** 1-2 days (individual account)
- **Seller Name:** Your legal name (individual account)

### Submission Assets

| Asset | Specification | Notes |
|-------|--------------|-------|
| App Icon | 1024 x 1024px PNG | No transparency, no rounded corners |
| Screenshots | 1320 x 2868px (iPhone 16 Pro Max) | 3-5 required, smaller sizes auto-scale |
| App Preview | 1080p video (optional) | Max 30 seconds |
| Privacy Policy | Public URL | Required, must be accessible in-app |

### Privacy Requirements (App Privacy Labels)

**Data to Declare:**
- Search history (if stored locally)
- Usage data (analytics)
- Device identifiers (if using push notifications)

**Good News:** No personal information collected, no account system needed.

### TestFlight Testing

- **Internal Testing:** Up to 100 testers, builds available in ~20 minutes
- **External Testing:** Up to 10,000 testers, requires Beta App Review (24-48 hours)
- **Recommended Duration:** 2 weeks minimum

### Common Rejection Reasons (to Avoid)

1. Crashes or bugs (test extensively)
2. Placeholder content (remove all "Lorem ipsum")
3. Broken links (verify privacy policy URL)
4. Missing features mentioned in description
5. Performance issues

### Review Timeline

- **Typical Review:** 24-48 hours
- **90% reviewed within:** 24 hours
- **Closed Dates:** December 20-26 (avoid)

---

## Post-Launch Roadmap

### Immediate (Weeks 17-20)
- Monitor crash reports (Xcode Organizer)
- Respond to App Store reviews
- Fix critical bugs
- Release first update (2-4 weeks after launch)

### Phase 2 Features (3-6 Months)
- Push notifications for new decisions (requires backend)
- Widgets for upcoming arguments
- Share functionality with legal citations
- Comparison tools (analyze cases across terms)
- Dark mode refinements
- iPad-optimized layout

### Phase 3 Enhancements (6-12 Months)
- Machine learning case predictions
- Natural language search ("cases about free speech")
- Justice biography deep-dives
- Historical landmark case collections
- Export voting data (CSV, PDF reports)

### Sustainability & Maintenance

**Annual Updates:**
- SCDB data refresh (September)
- New term setup (October)
- iOS version compatibility

**API Monitoring:**
- CourtListener: 5,000 requests/day sufficient for substantial user base
- Implement aggressive caching (most Court data is static once published)
- Monitor rate limits via API response headers

**Cost Projections:**
- Year 1: $99 (Apple Developer)
- Year 2+: $99 + optional backend hosting (if adding push notifications)

---

## Differentiation & Target Audience

### Target Users
1. **Civic-minded citizens** wanting accessible Supreme Court information
2. **Legal professionals** needing portable reference tools
3. **Students & educators** studying constitutional law
4. **Journalists** covering Court decisions

### Competitive Advantage
**Voting pattern analytics** - Existing apps (SCOTUS, Oyez mobile) focus on case information but rarely visualize:
- Justice alignment trends over time
- Ideological patterns with SCDB depth
- Pairwise agreement matrices
- Issue-area breakdowns

### App Positioning
"A law library in your pocket. The Bluebook meets the terminal."

---

## Essential Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| CourtListener API | courtlistener.com/help/api/ | Primary case data |
| Oyez API | api.oyez.org/cases | Oral argument audio |
| SCDB Download | scdb.la.psu.edu | Voting pattern data |
| Apple Developer | developer.apple.com/programs | $99 enrollment |
| App Review Guidelines | developer.apple.com/app-store/review/guidelines | Avoid rejections |
| Swift Charts Docs | developer.apple.com/documentation/charts | Visualization library |
| PDFKit Docs | developer.apple.com/documentation/pdfkit | PDF rendering |
| AVFoundation Docs | developer.apple.com/documentation/avfoundation | Audio playback |
| SwiftData Docs | developer.apple.com/documentation/swiftdata | Local persistence |

---

## Technical Feasibility Assessment

**Complexity Level:** Moderate

**Key Challenges:**
1. PDF parsing for calendar data (workaround: manual entry + web scraping)
2. Audio streaming performance (mitigated by AVFoundation's robustness)
3. SCDB data size (~35MB CSV, 300k+ rows) - manageable with SwiftData indexing

**Advantages:**
1. All APIs are free with generous limits
2. SwiftUI + Swift Charts = rapid UI development
3. Native frameworks (PDFKit, AVFoundation) = zero configuration
4. No backend required for MVP (all data from public APIs)

**Estimated Dev Time (Solo):** 12-16 weeks (as outlined in timeline)

**Recommended Approach:** Build features incrementally, test early and often, leverage native frameworks over third-party dependencies.

---

## Next Steps

1. **Week 0 Prep:**
   - Enroll in Apple Developer Program
   - Create CourtListener account + API token
   - Download SCDB dataset
   - Set up Xcode project

2. **Design First:**
   - Finalize design language (see `design-language.md`)
   - Create reusable SwiftUI components
   - Build design system tokens

3. **Build Iteratively:**
   - Start with case browsing (core value)
   - Add PDF viewing (high user value)
   - Layer in audio, voting dashboard, polish

4. **Test Relentlessly:**
   - Every feature tested on real device
   - Beta test with 10+ users
   - Fix all crashes before submission

5. **Launch with Confidence:**
   - Clear App Store description
   - High-quality screenshots
   - Prompt review response
