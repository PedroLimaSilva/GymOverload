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
        let schema = Schema([Exercise.self, WorkoutTemplate.self])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [config])
        let context = container.mainContext
        
        // Load Exercises from JSON
        let exercises = ModelDataLoader.loadExercises()
        for exercise in exercises {
            context.insert(exercise)
        }
        
        // Load Sets from JSON (optional — or just hardcode for now)
        return container
    }()
}
