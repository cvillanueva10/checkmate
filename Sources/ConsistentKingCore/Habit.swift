import Foundation

public enum HabitError: Error, Equatable {
    case emptyName
    case invalidGoal
    case invalidDateRange
    case checkInOutsideTrackingPeriod
}

public enum HabitGoal: Equatable, Sendable {
    case streak(days: Int)
    case consistency(percent: Double)
}

public struct HabitProgress: Equatable, Sendable {
    public let completedDays: Int
    public let trackedDays: Int
    public let currentStreak: Int
    public let longestStreak: Int
    public let consistencyPercent: Double
    public let goalReached: Bool
}

/// A daily habit. The supplied calendar defines day boundaries for its lifetime.
public struct Habit: Sendable {
    public let id: UUID
    public let name: String
    public let goal: HabitGoal
    public let startDate: Date
    public let endDate: Date
    private let calendar: Calendar
    private var completions: Set<Date> = []

    public init(
        id: UUID = UUID(), name: String, goal: HabitGoal,
        startDate: Date, endDate: Date, calendar: Calendar
    ) throws {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { throw HabitError.emptyName }
        switch goal {
        case .streak(let days):
            guard days > 0 else { throw HabitError.invalidGoal }
        case .consistency(let percent):
            guard percent.isFinite, percent > 0, percent <= 100 else {
                throw HabitError.invalidGoal
            }
        }
        let start = calendar.startOfDay(for: startDate)
        let end = calendar.startOfDay(for: endDate)
        guard start <= end else { throw HabitError.invalidDateRange }
        self.id = id
        self.name = name
        self.goal = goal
        self.startDate = start
        self.endDate = end
        self.calendar = calendar
    }

    /// Repeated check-ins on the same day count once. Future check-ins are rejected.
    public mutating func checkIn(on date: Date, asOf now: Date) throws {
        let day = calendar.startOfDay(for: date)
        guard day >= startDate, day <= endDate,
              day <= calendar.startOfDay(for: now) else {
            throw HabitError.checkInOutsideTrackingPeriod
        }
        completions.insert(day)
    }

    public mutating func undoCheckIn(on date: Date) {
        completions.remove(calendar.startOfDay(for: date))
    }

    /// Consistency includes today and all elapsed days, capped at the goal end date.
    /// An unfinished today preserves yesterday's streak until the day ends.
    public func progress(asOf date: Date) -> HabitProgress {
        let today = calendar.startOfDay(for: date)
        let lastDay = min(today, endDate)
        var tracked = 0
        var completed = 0
        var run = 0
        var longest = 0
        var current = 0
        var day = startDate
        while day <= lastDay {
            tracked += 1
            if completions.contains(day) {
                completed += 1
                run += 1
                longest = max(longest, run)
                current = run
            } else {
                if day != today { current = 0 }
                run = 0
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: day), next > day else {
                break
            }
            day = next
        }
        let percent = tracked == 0 ? 0 : Double(completed) / Double(tracked) * 100
        let reached: Bool
        switch goal {
        case .streak(let days): reached = longest >= days
        case .consistency(let target): reached = tracked > 0 && percent >= target
        }
        return HabitProgress(
            completedDays: completed, trackedDays: tracked, currentStreak: current,
            longestStreak: longest, consistencyPercent: percent, goalReached: reached
        )
    }
}
