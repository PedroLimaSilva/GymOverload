import SwiftData
import Foundation

struct PlannedSet: Codable, Hashable, Identifiable {
    var id = UUID()
    var reps: Int
    var weight: Double
    var restSeconds: Int
}

struct PlannedExercise: Codable, Hashable, Identifiable {
    var id = UUID()
    var name: String
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


// DTOs used only for decoding
struct PlannedSetDTO: Codable {
    let reps: Int
    let weight: Double
    let restSeconds: Int
    func toModel() -> PlannedSet {
        PlannedSet(reps: reps, weight: weight, restSeconds: restSeconds)
    }
}

struct PlannedExerciseDTO: Codable {
    let name: String
    let sets: [PlannedSetDTO]
    
    func toModel() -> PlannedExercise {
        PlannedExercise(
            name: name,
            sets: sets.map { $0.toModel() }
        )
    }
}

struct WorkoutTemplateDTO: Decodable {
    let name: String
    let plannedExercises: [PlannedExerciseDTO]
    
    func toModel() -> WorkoutTemplate {
        WorkoutTemplate(
            name: name,
            plannedExercises: plannedExercises.map { $0.toModel() }
        )
    }
}
