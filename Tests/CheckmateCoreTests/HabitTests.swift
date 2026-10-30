import Foundation
import Testing
@testable import CheckmateCore

private var calendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar
}

private func day(_ number: Int) -> Date {
    calendar.date(from: DateComponents(year: 2026, month: 10, day: number))!
}

private func habit(goal: HabitGoal = .streak(days: 3)) throws -> Habit {
    try Habit(name: "Read", goal: goal, startDate: day(1), endDate: day(10), calendar: calendar)
}

@Test func checkInsCountOnceAndCanBeUndone() throws {
    var habit = try habit()
    try habit.checkIn(on: day(1), asOf: day(1))
    try habit.checkIn(on: day(1).addingTimeInterval(3600), asOf: day(1))
    #expect(habit.progress(asOf: day(1)).completedDays == 1)
    habit.undoCheckIn(on: day(1))
    #expect(habit.progress(asOf: day(1)).completedDays == 0)
}

@Test func streakSurvivesUnfinishedTodayButBreaksAfterMissedDay() throws {
    var habit = try habit()
    for n in 1...3 { try habit.checkIn(on: day(n), asOf: day(3)) }
    #expect(habit.progress(asOf: day(4)).currentStreak == 3)
    #expect(habit.progress(asOf: day(4)).goalReached)
    #expect(habit.progress(asOf: day(5)).currentStreak == 0)
    #expect(habit.progress(asOf: day(5)).longestStreak == 3)
}

@Test func consistencyUsesElapsedDaysAndStopsAtEndDate() throws {
    var habit = try habit(goal: .consistency(percent: 75))
    for n in 1...3 { try habit.checkIn(on: day(n), asOf: day(3)) }
    #expect(habit.progress(asOf: day(4)).consistencyPercent == 75)
    #expect(habit.progress(asOf: day(4)).goalReached)
    #expect(!habit.progress(asOf: day(5)).goalReached)
    #expect(habit.progress(asOf: day(20)).trackedDays == 10)
    #expect(habit.progress(asOf: day(20)).consistencyPercent == 30)
    #expect(habit.progress(asOf: day(1).addingTimeInterval(-86400)).trackedDays == 0)
}

@Test func invalidInputsAreRejected() throws {
    #expect(throws: HabitError.emptyName) {
        try Habit(name: " ", goal: .streak(days: 1), startDate: day(1), endDate: day(2), calendar: calendar)
    }
    #expect(throws: HabitError.invalidGoal) { try habit(goal: .streak(days: 0)) }
    #expect(throws: HabitError.invalidGoal) { try habit(goal: .consistency(percent: .nan)) }
    #expect(throws: HabitError.invalidGoal) { try habit(goal: .consistency(percent: 101)) }
    #expect(throws: HabitError.invalidDateRange) {
        try Habit(name: "Read", goal: .streak(days: 1), startDate: day(2), endDate: day(1), calendar: calendar)
    }
    var habit = try habit()
    #expect(throws: HabitError.checkInOutsideTrackingPeriod) {
        try habit.checkIn(on: day(2), asOf: day(1))
    }
    #expect(throws: HabitError.checkInOutsideTrackingPeriod) {
        try habit.checkIn(on: day(11), asOf: day(20))
    }
}
