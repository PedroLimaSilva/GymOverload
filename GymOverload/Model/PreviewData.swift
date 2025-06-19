//
//  PreviewData.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftData

@MainActor
enum PreviewData {
    static let container: ModelContainer = {
        let schema = Schema([Exercise.self, WorkoutSet.self])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [config])
        let context = container.mainContext
        
        // Load Exercises from JSON
        let exercises = ModelDataLoader.loadExercises()
        for exercise in exercises {
            context.insert(exercise)
        }
        
        // Load Sets from JSON (optional — or just hardcode for now)
        // context.insert(WorkoutSet(exerciseName: "Squat", weight: 100, reps: 8, restTime: 120))
        // context.insert(WorkoutSet(exerciseName: "Deadlift", weight: 140, reps: 5, restTime: 180))
        
        return container
    }()
}
