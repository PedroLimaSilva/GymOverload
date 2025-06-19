//
//  WorkoutTemplate.swift
//  GymOverload
//
//  Created by AI Assistant on 19/06/2025.
//

import Foundation
import SwiftData

@Model
final class WorkoutTemplate {
    var name: String
    var plannedExercises: [PlannedExercise]
    var lastUsed: Date?

    init(name: String, plannedExercises: [PlannedExercise] = [], lastUsed: Date? = nil) {
        self.name = name
        self.plannedExercises = plannedExercises
        self.lastUsed = lastUsed
    }
}

struct PlannedSet: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var reps: Int
    var weight: Double
    var restSeconds: Int
}

struct PlannedExercise: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var exerciseName: String
    var sets: [PlannedSet]
}
