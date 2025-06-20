import SwiftData
import Foundation

struct PlannedSet: Codable, Hashable, Identifiable {
    let id = UUID()
    var reps: Int
    var weight: Double
    var restSeconds: Int
}

struct PlannedExercise: Codable, Hashable, Identifiable {
    let id = UUID()
    var exerciseName: String
    var sets: [PlannedSet] = []
}

@Model
final class WorkoutTemplate {
    var name: String
    var plannedExercises: [PlannedExercise] = []

    init(name: String, plannedExercises: [PlannedExercise] = []) {
        self.name = name
        self.plannedExercises = plannedExercises
    }
}
