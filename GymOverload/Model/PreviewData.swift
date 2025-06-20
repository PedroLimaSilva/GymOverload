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

        // Insert some base exercises
        let exercises = ModelDataLoader.loadExercises()
        for exercise in exercises {
            print("Loaded exercise", exercise.name)
            context.insert(exercise)
        }
        
        let templates = ModelDataLoader.loadWorkoutTemplates()
        for template in templates {
            print("Loaded template", template.name)
            context.insert(template)
        }

        return container
    }()
}
