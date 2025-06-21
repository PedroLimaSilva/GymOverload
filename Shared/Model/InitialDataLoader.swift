//
//  InitialDataLoader.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import SwiftData

@MainActor
struct InitialDataLoader {
    static func preloadIfNeeded(context: ModelContext) async {
        let exercises = try? context.fetch(FetchDescriptor<Exercise>())
        let templates = try? context.fetch(FetchDescriptor<WorkoutTemplate>())

        guard (exercises?.isEmpty ?? true) && (templates?.isEmpty ?? true) else { return }

        let fallbackExercises = ModelDataLoader.loadExercises()
        let fallbackTemplates = ModelDataLoader.loadWorkoutTemplates()

        fallbackExercises.forEach { context.insert($0) }
        fallbackTemplates.forEach { context.insert($0) }

        try? context.save()
    }
}
