//
//  SharedModelContainer.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import SwiftData

enum SharedModelContainer {
    static var container: ModelContainer = {
        let schema = Schema([
            Exercise.self,
            WorkoutTemplate.self,
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            let container = try ModelContainer(for: schema, configurations: [configuration])
            let context = container.mainContext

            // Load exercises from JSON
            let exercises = ModelDataLoader.loadExercises()
            for exercise in exercises {
                context.insert(exercise)
            }

            // Insert one workout template if none exist
            let templates = ModelDataLoader.loadWorkoutTemplates()
            for template in templates {
                context.insert(template)
            }


            return container
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }()
}
