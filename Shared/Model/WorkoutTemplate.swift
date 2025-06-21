import SwiftData
import Foundation

struct PlannedExercise: Codable, Hashable, Identifiable {
    var id = UUID()
    var name: String
    var sets: Int
    var targetReps: Int
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


// DTOs used only for decoding
struct PlannedExerciseDTO: Codable {
    let name: String
    var sets: Int
    var targetReps: Int

    func toModel() -> PlannedExercise {
        PlannedExercise(
            name: name,
            sets: sets,
            targetReps: targetReps
        )
    }

    init(from model: PlannedExercise) {
        self.name = model.name
        self.sets = model.sets
        self.targetReps = model.targetReps
    }
}

struct WorkoutTemplateDTO: Codable {
    let name: String
    let plannedExercises: [PlannedExerciseDTO]

    func toModel() -> WorkoutTemplate {
        WorkoutTemplate(
            name: name,
            plannedExercises: plannedExercises.map { $0.toModel() }
        )
    }

    init(from model: WorkoutTemplate) {
        self.name = model.name
        self.plannedExercises = model.plannedExercises.map { PlannedExerciseDTO(from: $0) }
    }
}
