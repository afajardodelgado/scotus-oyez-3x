# Design Language System: "The Paper IDE"
## SCOTUS Case Tracker | Native iOS Application

## RULE #1: NO EMOJIS

**NEVER use emojis in this application.** No exceptions. Not in UI copy, not in success messages, not in error states, not in notifications, not in push notifications. The aesthetic is formal, timeless, and analog.

---

## 1. Core Philosophy

**"Law as Scripture."**

The aesthetic treats Supreme Court opinions not as data, but as constitutional text. The design eliminates the "digital" noise of modern web design (gradients, shadows, bright neons) in favor of the timeless authority of a printed legal brief, grounded by the structural logic of case law citation.

* **Keywords:** Authoritative, Analog, Structural, Deliberate, Permanent.
* **The Vibe:** A law library in your pocket. The Bluebook meets the terminal.

---

## 2. Color Palette

The palette mimics natural materials: unbleached paper and graphite ink. There is no pure white and no pure black.

### Primary Colors

* **Canvas (Background):** `#F4F1EA`
  * *Usage:* Global background. A warm, bone/cream color that reduces blue-light strain and evokes the feeling of parchment.

* **Ink (Primary Text):** `#222222`
  * *Usage:* Body text, headers, active states. A soft charcoal/graphite rather than #000000.

* **Fade (Secondary Text):** `#888888`
  * *Usage:* Line numbers, meta-data, inactive states.

### Accent Colors

* *Note:* This design language eschews traditional "brand colors" (like blue for links).
* **Error/Alert:** `#9E2A2B` (Deep oxide red—reminiscent of a red editor's pen or dissenting opinion marker).
* **Success/State:** `#4A5D23` (Muted moss green).
* **Citation/Link:** `#2A4D69` (Deep legal blue—used sparingly for case citations and internal references).

---

## 3. Typography

The tension of the design relies entirely on the pairing of a **Humanist Serif** (The Opinion) and a **Rational Monospace** (The Docket).

### Typeface A: "The Opinion" (Serif)

* **Style:** Old-Style Serif
* **Primary Choice:** **EB Garamond** (available via Google Fonts, iOS-compatible)
* **iOS System Fallback:** **New York** (Apple's serif, ships with iOS)
* **Characteristics:** High contrast, bracketed serifs, organic curves. Evokes traditional legal documents and Supreme Court briefs.
* **Usage:** All readable content, case names, opinion text, headers, justice names.
* **Rules:**
  * Never use bold weights for emphasis; use *italics* instead.
  * Leading (line-height) must be generous (1.5x to 1.7x) to allow dense legal text to breathe.
  * Minimum font size: 16pt base for body text (iOS legibility is paramount).
  * For lengthy opinion text (100+ pages), consider 17-18pt for extended reading sessions.

### Typeface B: "The Docket" (Monospace)

* **Style:** Clean Monospace
* **Primary Choice:** **SF Mono** (Apple's system monospace, ships with iOS)
* **Fallback:** **Menlo** (older iOS system monospace)
* **Usage:** Case numbers, docket IDs, dates, citations (e.g., *Roe v. Wade*, 410 U.S. 113), metadata, vote counts, UI labels, timestamps.
* **Rules:**
  * Minimum font size: 12pt–14pt (readable on iPhone).
  * Uppercase tracking (letter-spacing) increased slightly (+0.5pt) for case numbers and citations.
  * Use for all structured data: docket numbers like "23-719", dates like "March 4, 2024", vote splits like "5-4".

---

## 4. Layout System: The "Margin Grid" (iOS Native)

The defining layout feature is the **Legal Margin**. Every screen is treated like a legal brief viewed on an iPhone.

### iOS Native Principles

* **Touch Targets:** Minimum 44pt×44pt for all interactive elements (Apple HIG standard).
* **Thumb Zone:** Primary actions positioned in the lower third of the screen for one-handed use (iPhone optimization).
* **Vertical Scroll:** Use native `UIScrollView` / `ScrollView` (SwiftUI). Infinite scroll acceptable for case lists.
* **Safe Areas:** **Mandatory.** Always respect iOS safe area insets for:
  * Dynamic Island (iPhone 14 Pro+)
  * Notch (iPhone X-13)
  * Home indicator (all modern iPhones)
  * Use `.safeAreaInset()` or `.ignoresSafeArea()` intentionally in SwiftUI.

### The Margin Column (Adaptive for iPhone & iPad)

* **iPhone (Portrait):** A narrow left margin (24pt–32pt) contains minimal metadata:
  * Case numbers
  * Decision year
  * Vote count (e.g., `5-4`)
  * These are rendered vertically adjacent to case titles, not as line numbers.

* **iPad / iPhone (Landscape):** The margin expands (40pt–60pt) to accommodate more metadata and can function as a persistent gutter.

### Whitespace (Ma)

* The design uses **"Ma"** (negative space) deliberately, but not excessively on iPhone.
* **iPhone:** Content should use 90% of screen width (with 16pt–24pt horizontal padding).
* **iPad:** Content narrows to optimal reading width (60-70 characters), offset to the right of the margin column.

---

## 5. Imagery & Graphic Elements

### The Wireframe Aesthetic

* **Subject Matter:** Constitutional imagery—scales of justice (wireframe), gavels (line art), the Supreme Court building facade (vector outline), or abstract representations of judicial process (branching decision trees).
* **Style:** Vector strokes only. No fills. No shading. No gradients.
* **Line Weight:** Ultra-thin (0.5pt or 1px). Matches the stroke weight of the serif font hairlines.
* **Animation:** If animated, use `withAnimation(.linear)` in SwiftUI. Movement must be slow and deliberate (e.g., a scale balancing, a branching tree growing). No spring animations, no bouncing.
* **iOS Consideration:**
  * Vector graphics should use SF Symbols where appropriate (sparingly).
  * Custom vectors should be provided as PDF or SVG, compiled to Asset Catalog.
  * Support Dark Mode by providing stroke colors that adapt (though this app defaults to light mode).

---

## 6. UI Component Library (iOS Native)

### Buttons

* **Implementation:** Use SwiftUI `Button` with custom styling (avoid default iOS blue).
* **Style:** Text-only or bordered. Full-width on iPhone when primary action.
* **Normal:** Text in [Ink] color, underlined or simple box border (1pt).
* **Active/Pressed:** Invert colors (Ink background, Canvas text). Use `.buttonStyle(.plain)` to avoid default iOS button behavior.
* **Touch Target:** Minimum 44pt height. Generous padding (16pt vertical, 24pt horizontal).
* **Anti-pattern:** No rounded corners (`cornerRadius` > 2), no system shadows, no gradients.

### Navigation

* **iOS TabView:** Bottom tab bar with 3-5 primary sections:
  * Recent Decisions
  * Search
  * Bookmarks
  * About
* **Format:** Text labels only (no SF Symbol icons unless absolutely necessary). Monospace font.
* **Active State:** Custom indicator—underline or bracket notation: `[ Recent ]`.
* **Implementation:** Use SwiftUI `TabView` with custom `tabItem` styling to override default iOS appearance.

### Case List Items

* **Implementation:** Use SwiftUI `List` with custom row styling (remove default separators and disclosure indicators).
* **Structure:** Each case is a tappable row:
  * Case name (Serif, 16pt–18pt)
  * Case number + year (Monospace, 12pt, Fade color)
  * Vote count + decision type (Monospace, 12pt)
* **Dividers:** Thin 1pt horizontal `Divider()` between items (custom color).
* **Tap Target:** Full-width row, minimum 60pt height.
* **Interaction:** Use `.onTapGesture` or `NavigationLink` (styled to hide disclosure chevron).

### Inputs / Forms (Search)

* **Implementation:** Use SwiftUI `TextField` with custom styling.
* **Appearance:** Transparent background with single bottom border (1pt `Rectangle` overlay).
* **Focus:** Border thickens to 2pt when editing. No glow, no shadow.
* **Keyboard:** `.keyboardType(.default)` or `.webSearch` for search optimization.
* **Placeholder:** Monospace font, Fade color. Example: "Search by case name or docket number..."
* **Search Bar:** Consider using native `searchable()` modifier with custom styling.

### iOS-Specific Components

* **Navigation Bar:** Use `.navigationBarTitleDisplayMode(.inline)` for compact headers. Custom font (Serif) for titles.
* **Pull-to-Refresh:** Use native `.refreshable()` modifier for updating case lists from CourtListener API.
* **Haptics:** Use `UIImpactFeedbackGenerator` sparingly for significant actions (e.g., bookmarking a case, adding to calendar).
* **Swipe Actions:** Use `.swipeActions()` for contextual actions (e.g., bookmark, share, add to calendar).
* **Loading States:** Use subtle `ProgressView` (circular, small) in Canvas color. Never use animated spinners with bright colors.
* **Error States:** Display errors in monospace font with Error color. Example: "Failed to load opinions. Retry." with a text-only retry button.

---

## 7. Voice & Tone

* **The Persona:** The "Constitutional Scholar."
* **Tone:** Authoritative, precise, deliberate. Never casual or playful.
* **Writing Style:**
  * Use formal, declarative language. Legal precision matters.
  * Avoid unnecessary words. Brevity is authority.
  * *Example:* Instead of "Loading...", use "Retrieving opinions..." or "Querying docket..." or "Fetching audio...".
  * *Example:* Instead of "Oops! Something went wrong", use "Request failed. Retry.".
  * *Example:* Instead of "Contact Us," use "Submit feedback" or "Report issue."
  * *Example:* Instead of "Tap here to listen", use "Play oral argument."
  * *Example:* For empty states: "No cases found." or "No bookmarks saved."
  * **NEVER use emojis.** (See Rule #1)

### Data-Specific Copy Guidelines

* **Case Names:** Always use proper legal citation format: *Trump v. Anderson* (italicized in UI).
* **Docket Numbers:** Always use monospace: `23-719`.
* **Vote Counts:** Format as `9-0`, `5-4`, `6-3` (monospace).
* **Dates:** Use full format: "March 4, 2024" (monospace) or "Mar 4, 2024" for compact views.
* **Justice Names:** Full formal names: "Justice Sotomayor", "Chief Justice Roberts" (never "Sotomayor", never "CJ Roberts").

---

---

## 8. iOS Screen Layout Examples

### Case List View (iPhone)
```
┌─────────────────────────────────┐
│ ╔═══════════════════════════╗   │ ← Dynamic Island / Status Bar
│ ║  Recent Decisions         ║   │ ← Navigation bar (inline, serif)
├─────────────────────────────────┤
│ 24  Trump v. Anderson           │
│     23-719 | 2024 | 9-0          │ ← Metadata (monospace)
├─────────────────────────────────┤
│ 23  Dobbs v. Jackson            │
│     19-1392 | 2022 | 6-3         │
├─────────────────────────────────┤
│ 22  Students for Fair Admissions│
│     20-1199 | 2023 | 6-3         │
├─────────────────────────────────┤
│ [ Recent ]  Search  Bookmarks   │ ← iOS TabView (bottom, custom)
│ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂│ ← Home indicator safe area
└─────────────────────────────────┘
```

### Case Detail View (iPhone)
```
┌─────────────────────────────────┐
│ ╔═══════════════════════════╗   │ ← Dynamic Island / Status Bar
│ ← Trump v. Anderson             │ ← Back button + title (serif)
├─────────────────────────────────┤
│                                 │
│ Trump v. Anderson               │ ← Case name (serif, 22pt)
│                                 │
│ Docket: 23-719                  │ ← Metadata block (mono, 12pt)
│ Decided: March 4, 2024          │
│ Vote: 9-0                       │
│ Per Curiam                      │
│                                 │
├─────────────────────────────────┤
│ Whether the Colorado Supreme    │ ← Opinion text (serif, 16pt)
│ Court erred in ordering former  │    (ScrollView content)
│ President Trump excluded from   │
│ the 2024 presidential ballot... │
│                                 │
│ [Full opinion continues...]     │
│                                 │
│ [Bookmark] [Share]              │ ← Swipe actions or bottom bar
│ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂│ ← Home indicator safe area
└─────────────────────────────────┘
```

---

## 9. SwiftUI Design Tokens (Copy-Paste)

```swift
import SwiftUI

// MARK: - Design Tokens
extension Color {
    // SCOTUS Tracker - iOS Theme

    // Primary Colors
    static let canvas = Color(hex: "#F4F1EA")
    static let ink = Color(hex: "#222222")
    static let fade = Color(hex: "#888888")

    // Accent Colors
    static let error = Color(hex: "#9E2A2B")
    static let success = Color(hex: "#4A5D23")
    static let citation = Color(hex: "#2A4D69")

    // Helper for hex colors
    init(hex: String) {
        let scanner = Scanner(string: hex)
        scanner.currentIndex = hex.startIndex
        if hex.hasPrefix("#") {
            scanner.currentIndex = hex.index(after: hex.startIndex)
        }

        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Typography
struct DesignSystem {
    // Fonts
    static let fontSerif = "EBGaramond-Regular" // Primary: EB Garamond
    static let fontSerifFallback = "NewYorkMedium-Regular" // iOS fallback
    static let fontMono = "SFMono-Regular" // System monospace
    static let fontMonoFallback = "Menlo-Regular" // Older iOS fallback

    // Font Sizes (pt)
    static let fontSizeBase: CGFloat = 16 // Body text
    static let fontSizeOpinion: CGFloat = 17 // Long-form reading
    static let fontSizeLarge: CGFloat = 22 // Case names (detail view)
    static let fontSizeSmall: CGFloat = 12 // Metadata, docket numbers
    static let fontSizeTiny: CGFloat = 10 // Timestamps, fine print

    // Line Heights
    static let lineHeightBody: CGFloat = 1.6
    static let lineHeightOpinion: CGFloat = 1.7 // Extra generous for dense text

    // Letter Spacing (tracking)
    static let trackingMonospace: CGFloat = 0.5 // For docket numbers, citations

    // Spacing (pt)
    static let spacingXS: CGFloat = 8
    static let spacingSM: CGFloat = 16
    static let spacingMD: CGFloat = 24
    static let spacingLG: CGFloat = 32
    static let spacingXL: CGFloat = 48
    static let spacingMargin: CGFloat = 24 // iPhone
    static let spacingMarginPad: CGFloat = 60 // iPad

    // Touch Targets
    static let touchTargetMin: CGFloat = 44
    static let touchTargetComfortable: CGFloat = 60 // For list items
}

// MARK: - Custom Text Styles
extension Text {
    /// Case name in list view (serif, medium size)
    func caseNameStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontSerif, size: 18))
            .italic() // Legal case names are italicized
            .foregroundColor(.ink)
            .lineSpacing(DesignSystem.lineHeightBody)
    }

    /// Case name in detail view (serif, large)
    func caseNameLargeStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontSerif, size: DesignSystem.fontSizeLarge))
            .italic()
            .foregroundColor(.ink)
    }

    /// Metadata: docket numbers, dates, vote counts (monospace, small, fade)
    func caseMetadataStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontMono, size: DesignSystem.fontSizeSmall))
            .foregroundColor(.fade)
            .tracking(DesignSystem.trackingMonospace)
    }

    /// Long-form opinion text (serif, generous line height)
    func opinionBodyStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontSerif, size: DesignSystem.fontSizeOpinion))
            .foregroundColor(.ink)
            .lineSpacing(DesignSystem.lineHeightOpinion * DesignSystem.fontSizeOpinion)
    }

    /// Justice names (serif, regular, ink)
    func justiceNameStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontSerif, size: DesignSystem.fontSizeBase))
            .foregroundColor(.ink)
    }

    /// Error messages (monospace, error color)
    func errorMessageStyle() -> some View {
        self
            .font(.custom(DesignSystem.fontMono, size: DesignSystem.fontSizeSmall))
            .foregroundColor(.error)
    }
}

// MARK: - Custom Button Style
struct PaperButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(configuration.isPressed ? Color.ink : Color.clear)
            .foregroundColor(configuration.isPressed ? Color.canvas : Color.ink)
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(Color.ink, lineWidth: 1)
            )
    }
}
```

---

## 10. iOS-Specific Technical Requirements

### Deployment

* **Minimum iOS Version:** iOS 16.0 (for modern SwiftUI features like `.searchable()`, `.refreshable()`)
* **Target Devices:** iPhone (primary), iPad (secondary support)
* **Orientation:** Portrait preferred, landscape supported
* **Dark Mode:** Light mode by default. Dark mode optional (requires color adaptations for Canvas/Ink).

### Performance

* **Launch Time:** Must launch in < 2 seconds on iPhone 12 or newer.
* **Scroll Performance:** 60fps minimum for case lists (optimize List rendering).
* **Network:** Graceful handling of slow/offline connections. Cache case data locally.

### Accessibility (a11y)

* **VoiceOver:** All interactive elements must have accessibility labels.
* **Dynamic Type:** Support iOS Dynamic Type for vision accessibility (test at largest sizes).
* **Contrast:** Ensure Canvas/Ink color combo meets WCAG AA standards (already does).

### Data & Privacy

* **No Analytics by Default:** User tracking is opt-in only.
* **Local Storage:** Use SwiftData or Core Data for bookmarks and offline case storage.
* **No Emojis in Push Notifications:** (See Rule #1)
